"""Fluxos de recuperação após reinício, isolamento e exportação da fase 2."""

import asyncio
import os
import sys
from io import BytesIO
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from src.backend.config import REPO_ROOT, Settings
from src.backend.main import create_app
from src.backend.services.mocks import demo_cases


@pytest.fixture
def settings(tmp_path):
    return Settings(data_mode="mock", policy_mode="mock", database_path=tmp_path / "recovery.sqlite3")


def test_reopen_case_recovers_analysis_chats_and_drafts_without_generation(settings):
    with TestClient(create_app(settings)) as client:
        analysis = client.post("/api/analyze", json={"case_id": 1}).json()
        reply = client.post("/api/chat", json={"case_id": 1, "message": "Verificar o contrato"}).json()
        draft = client.post("/api/generate-draft", json={"case_id": 1, "action": "DEFESA"}).json()
    app = create_app(settings)
    with TestClient(app) as client:
        app.state.analysis.analyze = AsyncMock(side_effect=AssertionError("Recuperação não deve analisar novamente"))
        app.state.copilot.generate = AsyncMock(side_effect=AssertionError("Recuperação não deve chamar a IA"))
        recovered = client.get("/api/cases/1/analysis")
        assert recovered.status_code == 200
        assert recovered.json()["status"] == "available"
        assert recovered.json()["analysis"] == analysis
        assert recovered.json()["case_version"] == analysis["case_version"]
        chats = client.get("/api/cases/1/chats").json()
        assert chats["total"] == 1 and not chats["has_more"]
        assert chats["items"][0]["session_id"] == reply["session_id"]
        assert chats["items"][0]["title"] == "Verificar o contrato"
        assert chats["items"][0]["message_count"] == 2
        history = client.get(f'/api/cases/1/chat/{reply["session_id"]}').json()
        assert history["messages"][-1]["content"] == reply["answer"]
        drafts = client.get("/api/cases/1/drafts").json()
        assert drafts["total"] == 1
        assert drafts["items"][0]["draft_id"] == draft["draft_id"]
        assert "content_markdown" not in drafts["items"][0]
        assert client.get(f'/api/drafts/{draft["draft_id"]}').json() == draft
        app.state.analysis.analyze.assert_not_awaited()
        app.state.copilot.generate.assert_not_awaited()


def test_saved_analysis_distinguishes_absence_from_stale_and_selects_latest(settings):
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/cases/1/analysis").json() == {
            "case_id": 1, "case_version": 0, "status": "not_found", "analysis": None}
        first = client.post("/api/analyze", json={"case_id": 1}).json()
        latest = client.post("/api/analyze", json={"case_id": 1}).json()
        assert first["analysis_id"] != latest["analysis_id"]
        assert client.get("/api/cases/1/analysis").json()["analysis"] == latest
        decision = client.post("/api/decisions", json={"case_id": 1, "action": "DEFESA",
            "analysis_id": latest["analysis_id"], "expected_case_version": 0,
            "lawyer_id": "advogado", "law_firm_id": "escritorio"})
        assert decision.status_code == 201
    with TestClient(create_app(settings)) as client:
        historical = client.get("/api/cases/1/analysis").json()
        assert historical["status"] == "stale"
        assert historical["case_version"] == 1
        assert historical["analysis"] == latest


def test_recovery_lists_are_scoped_pageable_and_order_chats_by_last_exchange(settings):
    with TestClient(create_app(settings)) as client:
        chats, drafts = [], []
        for case_id in (1, 1, 2):
            chats.append(client.post("/api/chat", json={"case_id": case_id, "message": f"Consulta do caso {case_id}"}).json())
            drafts.append(client.post("/api/generate-draft", json={"case_id": case_id, "action": "DEFESA"}).json())
        first = client.get("/api/cases/1/chats?limit=1").json()
        second = client.get("/api/cases/1/chats?limit=1&offset=1").json()
        assert first["total"] == second["total"] == 2
        assert first["has_more"] and not second["has_more"]
        assert first["items"][0]["session_id"] == chats[1]["session_id"]
        assert second["items"][0]["session_id"] == chats[0]["session_id"]
        client.post("/api/chat", json={"case_id": 1, "session_id": chats[0]["session_id"], "message": "Continuar revisão"})
        resumed = client.get("/api/cases/1/chats?limit=1").json()["items"][0]
        assert resumed["session_id"] == chats[0]["session_id"] and resumed["message_count"] == 4
        first_draft = client.get("/api/cases/1/drafts?limit=1").json()
        second_draft = client.get("/api/cases/1/drafts?limit=1&offset=1").json()
        assert first_draft["total"] == second_draft["total"] == 2
        assert first_draft["has_more"] and not second_draft["has_more"]
        assert first_draft["items"][0]["draft_id"] == drafts[1]["draft_id"]
        assert second_draft["items"][0]["draft_id"] == drafts[0]["draft_id"]
        for endpoint in ("chats", "drafts"):
            assert client.get(f"/api/cases/1/{endpoint}?offset=2").json()["items"] == []
            assert client.get(f"/api/cases/2/{endpoint}").json()["total"] == 1


@pytest.mark.parametrize("endpoint", ["analysis", "chats", "drafts"])
def test_recovery_of_missing_case_returns_404(settings, endpoint):
    with TestClient(create_app(settings)) as client:
        assert client.get(f"/api/cases/999/{endpoint}").status_code == 404
        assert client.get(f"/api/cases/0/{endpoint}").status_code == 422


@pytest.mark.parametrize("endpoint", ["chats", "drafts"])
def test_empty_lists_and_invalid_pagination(settings, endpoint):
    with TestClient(create_app(settings)) as client:
        assert client.get(f"/api/cases/1/{endpoint}").json() == {
            "items": [], "total": 0, "limit": 20, "offset": 0, "has_more": False}
        for query in ("limit=0", "limit=101", "offset=-1"):
            assert client.get(f"/api/cases/1/{endpoint}?{query}").status_code == 422


def test_existing_sqlite_can_add_recovery_indexes_without_losing_data(settings):
    from src.backend.database.store import Store

    async def legacy_database():
        store = Store(settings.database_path, "mock")
        await store.initialize(demo_cases())
        async with store.connect() as db:
            for name in ("sessions_case", "messages_session", "drafts_case"):
                await db.execute(f"DROP INDEX {name}")
            await db.commit()
    asyncio.run(legacy_database())
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/cases").json()["total"] == 2
        assert client.get("/api/cases/1/chats").status_code == 200


def test_pdf_ignores_installed_weasyprint_and_preserves_export_contract(settings, monkeypatch):
    class UnusableWeasyPrint:
        def __getattr__(self, name):
            raise AssertionError("O PDF não deve consultar WeasyPrint ou Pango")
    monkeypatch.setitem(sys.modules, "weasyprint", UnusableWeasyPrint())
    with TestClient(create_app(settings)) as client:
        draft = client.post("/api/generate-draft", json={"case_id": 1, "action": "ACORDO", "settlement_amount": 1234.56}).json()
        response = client.post("/api/export-pdf", json={"draft_id": draft["draft_id"],
            "content_markdown": "# Revisão da proposta\n\nValor proposto: **R$ 1.234,56**.\n\nCondições [a preencher]."},
            headers={"Origin": "http://localhost:5173"})
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.headers["x-pdf-engine"] == "reportlab"
        assert "X-PDF-Engine" in response.headers["access-control-expose-headers"]
        text = "\n".join(p.extract_text() for p in PdfReader(BytesIO(response.content)).pages)
        assert "R$ 1.234,56" in text and "MINUTA PARA REVISÃO" in text
        assert client.get(f'/api/drafts/{draft["draft_id"]}').json()["content_markdown"] == draft["content_markdown"]


def test_default_api_runs_document_workflow_without_policy_or_monitor_imports(tmp_path, monkeypatch):
    import importlib
    original = importlib.import_module
    def prevent_external_modules(name, *args, **kwargs):
        if name.startswith(("src.policy", "src.monitor", "weasyprint")):
            raise AssertionError("Modo documental não pode depender de outras frentes ou de Pango")
        return original(name, *args, **kwargs)
    monkeypatch.setattr(importlib, "import_module", prevent_external_modules)
    artifacts = Path(os.getenv("SUITS_TEST_ARTIFACTS_DIR", str(REPO_ROOT / "artefacts/Hackaton Unicamp")))
    with TestClient(create_app(Settings(database_path=tmp_path / "independent.sqlite3", artifacts_dir=artifacts))) as client:
        analysis = client.post("/api/analyze", json={"case_id": 2}).json()
        assert analysis["policy_status"] == "unavailable"
        assert client.get("/api/cases/2/analysis").json()["analysis"] == analysis
        draft = client.post("/api/generate-draft", json={"case_id": 2, "action": "DEFESA"}).json()
        assert client.post("/api/export-pdf", json={"draft_id": draft["draft_id"]}).status_code == 200
