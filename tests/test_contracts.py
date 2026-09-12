"""Contratos HTTP e integração com o motor da B1 incorporado ao repositório."""

import importlib
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from src.backend.config import REPO_ROOT, Settings
from src.backend.dependencies import get_analysis_service, get_monitoring_service
from src.backend.main import create_app
from src.backend.schemas import (
    CaseDocument, ExtractedFact, MetricsResponse, NegotiationResponse,
    PolicyResult, SourceReference, SubsidiesInventoryResponse,
)
from src.backend.services.mocks import demo_cases
from src.backend.services.policy_adapter import policy_input


def dossier_fact(value, document_id="dossier"):
    return ExtractedFact(field="dossier_conformity", value=value, source=SourceReference(
        source_id=f"{document_id}:p1", document_id=document_id,
        document_name="Dossiê de teste", page=1, excerpt=value))


@pytest.fixture
def dossier_case():
    case = demo_cases()[0]
    case.subsidies.has_dossier = True
    case.documents.append(CaseDocument(id="dossier", name="Dossiê de teste",
        category="SUBSIDIO", document_type="DOSSIE"))
    return case


@pytest.mark.parametrize("verdict,expected", [
    ("CONFORMIDADE", "CONFORME"), ("NÃO CONFORMIDADE", "NAO_CONFORME"),
    ("NAO_CONFORME", "NAO_CONFORME"), ("conforme", "CONFORME"),
])
def test_dossier_conclusion_uses_explicit_b1_vocabulary(dossier_case, verdict, expected):
    dossier_case.facts = [dossier_fact(verdict)]
    payload, warnings = policy_input(dossier_case)
    assert payload["subsidios"]["dossie"] == expected
    assert warnings == []


def test_dossier_presence_or_other_document_cannot_become_conformity(dossier_case):
    dossier_case.facts = [dossier_fact("CONFORMIDADE", document_id="petition")]
    payload, warnings = policy_input(dossier_case)
    assert payload["subsidios"]["dossie"] is None
    assert warnings
    dossier_case.subsidies.has_dossier = False
    assert policy_input(dossier_case)[0]["subsidios"]["dossie"] == "AUSENTE"


def test_conflicting_dossier_conclusions_require_review(dossier_case):
    dossier_case.facts = [dossier_fact("CONFORMIDADE"), dossier_fact("NÃO CONFORMIDADE")]
    with pytest.raises(HTTPException) as error:
        policy_input(dossier_case)
    assert error.value.status_code == 422


def test_zero_cause_value_is_rejected_before_engine_call(tmp_path):
    case = demo_cases()[0]
    case.cause_value = 0
    with pytest.raises(HTTPException) as error:
        policy_input(case)
    assert error.value.status_code == 422
    with TestClient(create_app(Settings(data_mode="mock", database_path=tmp_path / "zero.sqlite3"))) as client:
        response = client.post("/api/cases", json={"case_number": "CASE-003", "title": "Novo caso",
            "uf": "MG", "sub_issue": "Contratação contestada", "cause_value": 0,
            "claimant_name": "Autor de teste", "defendant_name": "Banco de teste", "claims": ["Contestação"]})
        assert response.status_code == 422


def test_decisions_are_pageable_and_retain_registration_and_analysis(tmp_path):
    with TestClient(create_app(Settings(data_mode="mock", policy_mode="mock", database_path=tmp_path / "pages.sqlite3"))) as client:
        for case_id in (1, 2):
            analysis = client.post("/api/analyze", json={"case_id": case_id}).json()
            response = client.post("/api/decisions", json={"case_id": case_id, "action": "DEFESA",
                "lawyer_id": "test-lawyer", "law_firm_id": "test-firm", "expected_case_version": 0,
                "analysis_id": analysis["analysis_id"], "override_reason": "Revisão documental do advogado.",
                "idempotency_key": str(uuid4())})
            assert response.status_code == 201
        first = client.get("/api/decisions?limit=1").json()
        second = client.get("/api/decisions?limit=1&offset=1").json()
        assert first["total"] == second["total"] == 2
        assert first["has_more"] and not second["has_more"]
        assert first["items"][0]["decision"]["decision_id"] != second["items"][0]["decision"]["decision_id"]
        assert first["items"][0]["registration"]["law_firm_id"] == "test-firm"
        assert first["items"][0]["analysis"]["policy"]["confidence_score_semantics"] == "loss_probability"
        assert client.get("/api/decisions?case_id=1").json()["total"] == 1
        assert client.get("/api/decisions?offset=2").json()["items"] == []
        assert client.get("/api/decisions?limit=201").status_code == 422
        assert client.get("/api/decisions?offset=-1").status_code == 422


def test_all_monitoring_and_negotiation_routes_use_integration_dependencies(tmp_path):
    app = create_app(Settings(data_mode="mock", database_path=tmp_path / "dependencies.sqlite3"))
    class Monitor:
        adherence = AsyncMock(return_value=MetricsResponse(decision_count=11))
        effectiveness = AsyncMock(return_value=MetricsResponse(decision_count=22))
        subsidies = AsyncMock(return_value=SubsidiesInventoryResponse(total_cases=33, missing_by_type={}, data_mode="mock"))
    class Analysis:
        negotiate = AsyncMock(return_value=NegotiationResponse(case_id=1, proposed_amount=500,
            status="SEM_POLITICA", within_ceiling=None, requires_approval=True,
            pricing=None, explanation="Serviço injetado"))
    monitor, analysis = Monitor(), Analysis()
    app.dependency_overrides[get_monitoring_service] = lambda: monitor
    app.dependency_overrides[get_analysis_service] = lambda: analysis
    with TestClient(app) as client:
        assert client.get("/api/monitoring/adherence").json()["decision_count"] == 11
        assert client.get("/api/monitoring/effectiveness").json()["decision_count"] == 22
        assert client.get("/api/monitoring/subsidies").json()["total_cases"] == 33
        assert client.post("/api/negotiation-copilot", json={"case_id": 1, "proposed_amount": 500}).json()["explanation"] == "Serviço injetado"
    for method in (monitor.adherence, monitor.effectiveness, monitor.subsidies, analysis.negotiate):
        method.assert_awaited_once()


def test_openapi_snapshot_and_download_media_types():
    schema = create_app(Settings()).openapi()
    saved = REPO_ROOT / "src" / "backend" / "openapi.json"
    assert json.loads(saved.read_text(encoding="utf-8")) == schema
    for path, method in (("/api/export-pdf", "post"),
        ("/api/cases/{case_id}/documents/{document_id}/download", "get")):
        content = schema["paths"][path][method]["responses"]["200"]["content"]
        assert "application/json" not in content
        assert content["application/pdf"]["schema"]["format"] == "binary"


@pytest.fixture
def remote_engine(monkeypatch):
    root = os.getenv("SUITS_CONTRACT_B1_ROOT", str(REPO_ROOT))
    monkeypatch.syspath_prepend(root)
    engine = importlib.import_module("src.policy.engine")
    assert Path(engine.__file__).resolve().is_relative_to(Path(root).resolve())
    def forbid_model_loading():
        raise AssertionError("Este teste de contrato não deve carregar o pickle do modelo.")
    monkeypatch.setattr(engine, "get_model", forbid_model_loading)
    return engine


def test_remote_b1_accepts_document_cases_and_backend_preserves_its_results(remote_engine, tmp_path, monkeypatch):
    original = remote_engine.evaluate_case
    captured = []
    def evaluate(payload):
        normalized = remote_engine._normalize_case_input(payload)
        assert normalized.valor_causa == payload["valor_causa"]
        assert normalized.numero_processo == payload["numero_processo"]
        result = original(payload)
        captured.append((normalized, result.model_dump()))
        return result
    monkeypatch.setattr(remote_engine, "evaluate_case", evaluate)
    artifacts = Path(os.getenv("SUITS_TEST_ARTIFACTS_DIR", str(REPO_ROOT / "artefacts/Hackaton Unicamp")))
    with TestClient(create_app(Settings(artifacts_dir=artifacts, policy_mode="engine", database_path=tmp_path / "b1.sqlite3"))) as client:
        for case_id, cause_value, code, score in ((1, 20000, "CADEIA_COMPLETA", 0.95), (2, 25000, "FALHA_PROBATORIA", 0.90)):
            response = client.post("/api/analyze", json={"case_id": case_id})
            assert response.status_code == 200, response.text
            body = response.json()
            assert body["policy_status"] == "available"
            assert body["analysis_id"]
            assert body["policy"]["reasoning_code"] == code
            assert body["policy"]["confidence_score"] == score
            assert body["policy"]["confidence_score_semantics"] == "unspecified"
            assert body["warnings"]
            normalized, raw = captured[-1]
            assert normalized.valor_causa == cause_value
            for key, value in raw.items():
                assert body["policy"][key] == value
        assert captured[0][0].subsidios.dossie == "CONFORME"
        assert captured[0][0].subsidios.contrato and captured[0][0].subsidios.extrato
        assert captured[1][0].subsidios.comprovante_credito
        assert not captured[1][0].subsidios.contrato


@pytest.mark.parametrize("probability,action,score", [(0.2, "DEFESA", 0.8), (0.6, "ACORDO", 0.6)])
def test_remote_b1_grey_zone_builds_its_own_features(remote_engine, monkeypatch, probability, action, score):
    import numpy as np
    case = demo_cases()[0]
    case.cause_value = 23456
    case.subsidies.has_credit_receipt = False
    class Predictor:
        def predict_proba(self, features):
            row = features.iloc[0]
            assert row["valor_causa"] == 23456
            assert row["log_valor_causa"] == pytest.approx(np.log1p(23456))
            assert row["qtd_criticos"] == 2
            assert row["uf"] == case.uf
            return np.array([[1 - probability, probability]])
    monkeypatch.setattr(remote_engine, "get_model", lambda: Predictor())
    payload, _ = policy_input(case)
    result = PolicyResult.model_validate(remote_engine.evaluate_case(payload).model_dump())
    assert result.recommendation == action
    assert result.confidence_score == score
    assert result.confidence_score_semantics == "unspecified"


def test_remote_b1_nonconforming_dossier_and_reason_codes(remote_engine, dossier_case):
    dossier_case.facts = [dossier_fact("NÃO CONFORMIDADE")]
    payload, _ = policy_input(dossier_case)
    result = PolicyResult.model_validate(remote_engine.evaluate_case(payload).model_dump())
    assert result.reasoning_code == "DOSSIE_NAO_CONFORME"
    assert result.recommendation == "ACORDO"
    assert result.settlement_pricing is not None
    b2_codes = PolicyResult.model_json_schema()["properties"]["reasoning_code"]["enum"]
    assert {code.value for code in remote_engine.ReasoningCode} <= set(b2_codes)
