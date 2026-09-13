import asyncio
import hashlib
import json
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock
from uuid import uuid4

import httpx2
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from openai import AsyncOpenAI
from pypdf import PdfReader

from src.backend.config import REPO_ROOT, Settings
from src.backend.main import create_app
from src.backend.schemas import ChatRequest, PolicyResult
from src.backend.services.copilot import Copilot, GroundedText
from src.backend.services.mocks import demo_cases
from src.backend.services.document_service import DocumentService


@pytest.fixture
def settings(tmp_path):
    artifacts = Path(os.getenv("SUITS_TEST_ARTIFACTS_DIR", str(REPO_ROOT / "artefacts" / "Hackaton Unicamp")))
    return Settings(artifacts_dir=artifacts, database_path=tmp_path / "workflow.sqlite3")


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as client:
        yield client


def decision_payload(case_id=1, **extra):
    return {"case_id": case_id, "action": "DEFESA", "lawyer_id": "adv-demo",
            "law_firm_id": "escritorio-demo", "expected_case_version": 0,
            "idempotency_key": str(uuid4()), **extra}


def test_imports_both_archives_with_page_evidence_and_original_downloads(client):
    one, two = client.get("/api/cases/1").json(), client.get("/api/cases/2").json()
    assert (one["uf"], one["cause_value"], len(one["documents"])) == ("MA", 20000, 7)
    assert (two["uf"], two["cause_value"], len(two["documents"])) == ("AM", 25000, 4)
    assert one["data_mode"] == "artifacts" and one["is_simulated"]
    assert one["defendant_name"] == "BANCO UFMG S.A."
    assert "Página 2" not in one["claims"][0]
    assert one["claims"][0].endswith(".")
    assert all(one["subsidies"].values())
    assert not two["subsidies"]["has_contract"] and not two["subsidies"]["has_statement"]
    pages = 0
    for case in [one, two]:
        for document in case["documents"]:
            download = client.get(document["download_url"])
            assert download.status_code == 200
            assert hashlib.sha256(download.content).hexdigest() == document["sha256"]
            detail = client.get(f'/api/cases/{case["id"]}/documents/{document["id"]}').json()
            assert len(detail["pages"]) == document["page_count"]
            pages += document["page_count"]
            for fact in detail["facts"]:
                assert fact["source"]["document_id"] == document["id"]
                assert fact["source"]["page"] <= document["page_count"]
    assert pages == 35


def test_document_checks_do_not_treat_a_claim_as_proven_fraud(client):
    case = client.get("/api/cases/2").json()
    checks = {check["code"]: check for check in case["checks"]}
    assert checks["CONTESTED_ACCOUNT_OWNERSHIP"]["status"] == "divergent"
    assert "alegação" in checks["CONTESTED_ACCOUNT_OWNERSHIP"]["message"]
    assert checks["MISSING_LIVENESS_RECORD"]["sources"][0]["page"] == 2
    assert checks["MISSING_CONTRATO"]["status"] == "not_verified"
    assert checks["COMPARE_CPF"]["status"] == "consistent"
    assert checks["COMPARE_LOAN_AMOUNT"]["status"] == "consistent"
    assert {f["value"] for f in case["facts"] if f["field"] == "loan_amount"} == {"8500.00"}


def test_document_ids_are_scoped_to_cases(client):
    assert client.get("/api/cases/2/documents/c1-d01").status_code == 404
    assert client.get("/api/cases/2/documents/c1-d01/download").status_code == 404


def test_analysis_without_engine_has_no_fabricated_policy(client):
    assert client.get("/api/cases/2").json()["status"] == "PENDENTE"
    result = client.post("/api/analyze", json={"case_id": 2})
    assert result.status_code == 200
    data = result.json()
    assert data["policy"] is None and data["policy_status"] == "unavailable"
    assert data["analysis_id"] and data["document_checks"] and data["sources"]
    proposal = client.post("/api/negotiation-copilot", json={"case_id": 2, "proposed_amount": 1000}).json()
    assert proposal["status"] == "SEM_POLITICA"
    assert proposal["within_ceiling"] is None and proposal["requires_approval"]
    assert client.get("/api/cases/2").json()["status"] == "EM_ANALISE"
    assert any(item["id"] == 2 for item in client.get("/api/cases?status=EM_ANALISE").json()["items"])


def test_chat_history_survives_restart_and_is_scoped_to_case(settings):
    with TestClient(create_app(settings)) as first:
        reply = first.post("/api/chat", json={"case_id": 2, "message": "Onde está o vídeo de liveness?"})
        assert reply.status_code == 200
        result = reply.json()
        assert result["generation_mode"] == "local" and result["sources"]
        session = result["session_id"]
    with TestClient(create_app(settings)) as second:
        history = second.get(f"/api/cases/2/chat/{session}").json()
        assert len(history["messages"]) == 2
        assert second.post("/api/chat", json={"case_id": 1, "session_id": session, "message": "Continue"}).status_code == 404
        assert second.get(f"/api/cases/1/chat/{session}").status_code == 404
        assert second.post("/api/chat", json={"case_id": 2, "session_id": session, "message": "E quanto ao contrato?"}).status_code == 200
        assert len(second.get(f"/api/cases/2/chat/{session}").json()["messages"]) == 4


def test_scenarios_keep_judge_prediction_unavailable(client):
    response = client.post("/api/scenarios", json={"case_id": 2})
    assert response.status_code == 200
    assert response.json()["author_arguments"] and response.json()["defense_arguments"]
    assert "Não há histórico validado" in response.json()["judicial_outlook"]


def test_decision_is_atomic_idempotent_and_preserved_on_restart(settings):
    payload = decision_payload()
    with TestClient(create_app(settings)) as client:
        first = client.post("/api/decisions", json=payload)
        assert first.status_code == 201
        assert first.json()["is_override"] is None
        assert client.post("/api/decisions", json=payload).json() == first.json()
        assert client.post("/api/decisions", json={**payload, "lawyer_id": "outro"}).status_code == 409
        assert client.post("/api/decisions", json=decision_payload()).status_code == 409
    with TestClient(create_app(settings)) as restarted:
        case = restarted.get("/api/cases/1").json()
        assert case["status"] == "CONCLUIDO" and case["version"] == 1
        assert len(restarted.get("/api/decisions").json()["items"]) == 1
        overview = restarted.get("/api/monitoring/overview").json()
        assert overview["active_lawyers_count"] == 1
        assert overview["total_cost_avoidance"] is None
        assert overview["adherence_rate"] is None


def test_two_concurrent_decisions_cannot_overwrite_each_other(client):
    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = [pool.submit(client.post, "/api/decisions", json=decision_payload()) for _ in range(2)]
        codes = sorted(future.result().status_code for future in futures)
    assert codes == [201, 409]
    assert len(client.get("/api/decisions").json()["items"]) == 1


def test_stale_version_does_not_write_decision(client):
    result = client.post("/api/decisions", json=decision_payload(expected_case_version=8))
    assert result.status_code == 409
    assert client.get("/api/cases/1").json()["status"] == "PENDENTE"
    assert client.get("/api/decisions").json()["items"] == []


def test_override_and_negotiation_use_stored_policy(tmp_path):
    settings = Settings(data_mode="mock", policy_mode="mock", database_path=tmp_path / "mock.sqlite3")
    with TestClient(create_app(settings)) as client:
        analysis = client.post("/api/analyze", json={"case_id": 2}).json()
        above = client.post("/api/negotiation-copilot", json={"case_id": 2, "proposed_amount": 4000.01}).json()
        assert above["status"] == "ACIMA_TETO" and above["requires_approval"]
        boundary = client.post("/api/negotiation-copilot", json={"case_id": 2, "proposed_amount": 4000}).json()
        assert boundary["within_ceiling"] is True
        payload = decision_payload(case_id=2, action="DEFESA", analysis_id=analysis["analysis_id"])
        assert client.post("/api/decisions", json=payload).status_code == 422
        accepted = client.post("/api/decisions", json={**payload, "override_reason": "Novos elementos revisados pelo advogado."})
        assert accepted.status_code == 201 and accepted.json()["is_override"] is True
        assert client.post("/api/negotiation-copilot", json={"case_id": 2, "proposed_amount": 1000}).json()["status"] == "SEM_POLITICA"


@pytest.mark.parametrize("amount", [-1, 0, 0.001, 1e20])
def test_invalid_settlement_amounts_are_rejected(client, amount):
    assert client.post("/api/generate-draft", json={"case_id": 2, "action": "ACORDO", "settlement_amount": amount}).status_code == 422
    assert client.post("/api/decisions", json=decision_payload(action="ACORDO", settlement_amount=amount)).status_code == 422


def test_draft_and_pdf_export_include_case_value_and_review_status(client):
    result = client.post("/api/generate-draft", json={"case_id": 2, "action": "ACORDO", "settlement_amount": 2345.67})
    assert result.status_code == 201
    draft = result.json()
    assert draft["status"] == "review_required" and "R$ 2.345,67" in draft["content_markdown"]
    assert "BANCO UFMG S.A." in draft["content_markdown"]
    assert client.get(f'/api/drafts/{draft["draft_id"]}').json() == draft
    exported = client.post("/api/export-pdf", json={"draft_id": draft["draft_id"]})
    assert exported.status_code == 200 and exported.content.startswith(b"%PDF-")
    text = "\n".join(page.extract_text() for page in PdfReader(BytesIO(exported.content)).pages)
    assert "2.345,67" in text and "0654321-09.2024.8.04.0001" in text
    assert "MINUTA PARA REVISÃO" in text
    assert exported.headers["x-pdf-engine"] == "reportlab"


def test_html_export_escapes_active_content_and_external_images(client):
    draft = client.post("/api/generate-draft", json={"case_id": 1, "action": "DEFESA"}).json()
    response = client.post("/api/export-pdf", json={"draft_id": draft["draft_id"], "format": "html",
        "content_markdown": '<script>alert(1)</script>\n\n![x](file:///secret)\n\n<img src="https://example.invalid/track">'})
    assert response.status_code == 200
    assert "<script>" not in response.text and "<img" not in response.text
    assert "default-src 'none'" in response.headers["content-security-policy"]


def test_manual_case_creation_is_persisted_and_rejects_duplicate_number(client):
    payload = {"case_number": "NOVO-TESTE", "title": "Novo cadastro manual", "uf": "SP",
        "sub_issue": "Contratação contestada", "cause_value": 5000, "claimant_name": "Parte teste",
        "defendant_name": "Banco teste", "claims": ["Relato informado pelo usuário."]}
    result = client.post("/api/cases", json=payload)
    assert result.status_code == 201
    assert result.json()["data_mode"] == "manual" and result.json()["is_simulated"] is False
    assert client.get(f'/api/cases/{result.json()["id"]}').json()["title"] == payload["title"]
    assert client.post("/api/cases", json=payload).status_code == 409


def test_monitoring_inventory_and_pending_metrics_are_explicit(client):
    inventory = client.get("/api/monitoring/subsidies").json()
    assert inventory["total_cases"] == 2
    assert inventory["missing_by_type"]["has_contract"] == 1
    for endpoint in ["adherence", "effectiveness"]:
        result = client.get(f"/api/monitoring/{endpoint}").json()
        assert result["status"] == "pending_integration" and result["indicators"] == []


def test_engine_adapter_sends_features_and_preserves_result(settings, monkeypatch):
    received = {}
    def evaluate_case(data):
        received.update(data)
        return PolicyResult(recommendation="DEFESA", reasoning_code="CADEIA_COMPLETA",
            confidence_score=0.12, risk_level="BAIXO", applied_rules=["Regra do teste."])
    original = __import__("importlib").import_module
    monkeypatch.setattr("src.backend.services.analysis_service.importlib.import_module",
        lambda name, *args: SimpleNamespace(evaluate_case=evaluate_case) if name == "src.policy.engine" else original(name, *args))
    with TestClient(create_app(replace(settings, policy_mode="engine"))) as client:
        result = client.post("/api/analyze", json={"case_id": 1})
        assert result.status_code == 200
        assert result.json()["policy"]["confidence_score"] == 0.12
        assert result.json()["policy_status"] == "available"
        assert received["valor_causa"] == 20000
        assert received["subsidios"]["contrato"]
        assert received["subsidios"]["dossie"] == "CONFORME"
        assert received["assunto"] is None
        assert result.json()["policy"]["confidence_score_semantics"] == "unspecified"
        assert any("semântica" in warning for warning in result.json()["warnings"])


@pytest.mark.parametrize("overrides, expected", [
    ({}, ("low", 25000, 120.0)),
    ({"OPENAI_REASONING_EFFORT": "high", "OPENAI_MAX_OUTPUT_TOKENS": "8000",
      "OPENAI_TIMEOUT_SECONDS": "75"}, ("high", 8000, 75.0)),
])
def test_openai_sdk_structured_output_without_external_network(tmp_path, monkeypatch, overrides, expected):
    calls = []
    monkeypatch.setattr("src.backend.config.REPO_ROOT", tmp_path)
    for name in ("OPENAI_MODEL", "OPENAI_REASONING_EFFORT", "OPENAI_MAX_OUTPUT_TOKENS", "OPENAI_TIMEOUT_SECONDS"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("SUITS_AI_MODE", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    for name, value in overrides.items():
        monkeypatch.setenv(name, value)

    def handle(request):
        payload = json.loads(request.content)
        calls.append(payload)
        assert request.url.path == "/v1/responses"
        return httpx2.Response(200, json={
            "id": "resp_test", "object": "response", "created_at": 0, "status": "completed", "model": "gpt-6-astra",
            "output": [{"id": "rs_test", "type": "reasoning", "summary": []},
                {"id": "msg_test", "type": "message", "status": "completed", "role": "assistant",
                "content": [{"type": "output_text", "annotations": [], "text": json.dumps({"text": "Resposta de teste.", "source_ids": [], "warnings": []})}]}],
        })
    async def run():
        monkeypatch.setattr("src.backend.services.copilot.AsyncOpenAI", lambda **kwargs: AsyncOpenAI(
            **kwargs, http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handle))))
        settings = replace(Settings.from_env(), database_path=tmp_path / "unused.sqlite3")
        copilot = Copilot(settings, DocumentService(), None)
        try:
            assert copilot.client.timeout == expected[2]
            assert copilot.client.max_retries == 1
            return await copilot.generate(GroundedText, "Consulta de teste", demo_cases()[0], [])
        finally:
            await copilot.close()
    result = asyncio.run(run())
    assert result.text == "Resposta de teste."
    assert calls[0]["model"] == "gpt-6-astra" and calls[0]["store"] is False
    assert calls[0]["reasoning"] == {"effort": expected[0]}
    assert calls[0]["max_output_tokens"] == expected[1]
    assert not {"temperature", "top_p", "top_logprobs", "logprobs"}.intersection(calls[0])
    assert calls[0]["text"]["format"]["type"] == "json_schema"
    assert calls[0]["text"]["format"]["strict"] is True


@pytest.mark.parametrize("status, output_kind", [
    ("incomplete", "valid_json"),
    ("incomplete", "reasoning_only"),
    ("incomplete", "truncated_json"),
    ("completed", "refusal"),
    ("failed", "valid_json"),
])
def test_openai_unfinished_or_refused_response_is_not_saved(status, output_kind):
    store = SimpleNamespace(save_exchange=AsyncMock())
    private_text = "CONTEUDO_PARCIAL_NAO_PUBLICAR"
    def handle(request):
        output = [{"id": "rs_test", "type": "reasoning", "summary": []}]
        if output_kind != "reasoning_only":
            content = {"type": "output_text", "annotations": [], "text": json.dumps({
                "text": private_text, "source_ids": [], "warnings": []})}
            if output_kind == "truncated_json":
                content["text"] = '{"text": "' + private_text
            elif output_kind == "refusal":
                content = {"type": "refusal", "refusal": private_text}
            output.append({"id": "msg_test", "type": "message", "role": "assistant",
                "status": "completed" if status == "completed" else "incomplete", "content": [content]})
        return httpx2.Response(200, json={
            "id": "resp_test", "object": "response", "created_at": 0, "model": "gpt-6-astra",
            "status": status, "output": output,
            "incomplete_details": {"reason": "max_output_tokens"} if status == "incomplete" else None,
        })
    async def run():
        client = AsyncOpenAI(api_key="test-only", http_client=httpx2.AsyncClient(transport=httpx2.MockTransport(handle)))
        copilot = Copilot(Settings(ai_mode="openai", openai_api_key="test-only"), DocumentService(), store, client=client)
        try:
            with pytest.raises(HTTPException) as error:
                await copilot.chat(demo_cases()[0], ChatRequest(case_id=1, message="Consulta de teste"))
            assert error.value.status_code == 502
            assert private_text not in error.value.detail
            store.save_exchange.assert_not_awaited()
        finally:
            await copilot.close()
    asyncio.run(run())


@pytest.mark.parametrize("name, value", [
    ("OPENAI_REASONING_EFFORT", "none"),
    ("OPENAI_MAX_OUTPUT_TOKENS", "0"),
    ("OPENAI_MAX_OUTPUT_TOKENS", "128001"),
    ("OPENAI_TIMEOUT_SECONDS", "nan"),
])
def test_invalid_openai_environment_is_rejected_before_request(tmp_path, monkeypatch, name, value):
    monkeypatch.setattr("src.backend.config.REPO_ROOT", tmp_path)
    monkeypatch.setenv(name, value)
    with pytest.raises(ValueError, match=name):
        Settings.from_env()


def test_unrecognized_ai_citation_is_rejected():
    with pytest.raises(Exception) as error:
        Copilot.cited(["invented-document:p1"], [])
    assert error.value.status_code == 502


def test_openai_requires_explicit_mode_and_key():
    assert Settings(openai_api_key="unused-key").ai_mode == "local"
    with pytest.raises(ValueError, match="OPENAI_API_KEY"):
        Settings(ai_mode="openai")
    with pytest.raises(ValueError, match="mock"):
        Settings(data_mode="artifacts", policy_mode="mock")
