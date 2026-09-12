import pytest
from fastapi.testclient import TestClient

from src.backend.config import Settings
from src.backend.dependencies import get_analysis_service, get_monitoring_service
from src.backend.main import create_app
from src.backend.schemas import AnalyzeResponse, MonitoringOverviewResponse, PolicyResult


@pytest.fixture
def app(tmp_path):
    return create_app(Settings(data_mode="mock", policy_mode="mock", database_path=tmp_path / "test.sqlite3"))


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client


def test_case_pagination_has_no_overlap_and_reports_total(client):
    first = client.get("/api/cases?page=1&page_size=1")
    second = client.get("/api/cases?page=2&page_size=1")
    assert first.status_code == second.status_code == 200
    assert first.json()["total"] == second.json()["total"] == 2
    assert first.json()["total_pages"] == 2
    assert first.json()["items"][0]["id"] != second.json()["items"][0]["id"]
    assert first.json()["data_mode"] == "mock"
    assert "documents" not in first.json()["items"][0]


def test_case_filters_are_combined_before_pagination(client):
    result = client.get("/api/cases?status=EM_ANALISE&uf=sp&page_size=1").json()
    assert result["total"] == 1
    assert result["items"][0]["uf"] == "SP"
    assert result["items"][0]["status"] == "EM_ANALISE"
    empty = client.get("/api/cases?status=PENDENTE&uf=SP").json()
    assert empty["items"] == []
    assert empty["total"] == empty["total_pages"] == 0


def test_page_past_last_page_is_empty_without_losing_total(client):
    result = client.get("/api/cases?page=99&page_size=1").json()
    assert result["items"] == []
    assert result["total"] == 2


@pytest.mark.parametrize(
    "query",
    ["page=0", "page_size=0", "page_size=101", "status=INVALIDO", "uf=SaoPaulo", "uf=ZZ", "uf=BR"],
)
def test_invalid_filters_return_validation_errors(client, query):
    assert client.get(f"/api/cases?{query}").status_code == 422


def test_openapi_lists_only_brazilian_ufs_in_filters_and_case_schemas(client):
    expected = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split()
    spec = client.get("/openapi.json").json()
    parameter = next(p for p in spec["paths"]["/api/cases"]["get"]["parameters"] if p["name"] == "uf")
    uf_schema = next(option for option in parameter["schema"]["anyOf"] if option.get("type") == "string")
    assert uf_schema["enum"] == expected
    assert "pattern" not in uf_schema
    for name in ["CaseSummary", "CaseDetail", "CaseCreateRequest"]:
        field = spec["components"]["schemas"][name]["properties"]["uf"]
        assert field["enum"] == expected
        assert "pattern" not in field


@pytest.mark.parametrize("uf, expected_status", [("df", 201), ("ZZ", 422), ("BR", 422)])
def test_case_creation_validates_uf_before_persisting(client, uf, expected_status):
    before = client.get("/api/cases").json()["total"]
    response = client.post("/api/cases", json={
        "case_number": "UF-TESTE", "title": "Cadastro para validação de UF", "uf": uf,
        "sub_issue": "Contratação contestada", "cause_value": 5000,
        "claimant_name": "Parte teste", "defendant_name": "Banco teste", "claims": ["Relato informado."],
    })
    assert response.status_code == expected_status
    if expected_status == 201:
        assert response.json()["uf"] == "DF"
        listed = client.get("/api/cases?uf=df").json()
        assert listed["total"] == 1 and listed["items"][0]["id"] == response.json()["id"]
    else:
        assert client.get("/api/cases").json()["total"] == before
        assert response.json()["detail"][0]["loc"] == ["body", "uf"]


def test_detail_has_autos_and_subsidies_without_broken_download_links(client):
    response = client.get("/api/cases/1")
    assert response.status_code == 200
    case = response.json()
    assert case["case_number"] == "DEMO-001"
    assert case["data_mode"] == "mock"
    assert {doc["category"] for doc in case["documents"]} == {"AUTOS", "SUBSIDIO"}
    assert all(doc["download_url"] is None for doc in case["documents"])


@pytest.mark.parametrize("case_id", [0, -1, "abc"])
def test_invalid_case_identifiers_are_rejected(client, case_id):
    assert client.get(f"/api/cases/{case_id}").status_code == 422
    assert client.post("/api/analyze", json={"case_id": case_id}).status_code == 422


def test_missing_case_returns_same_404_in_detail_and_analysis(client):
    detail = client.get("/api/cases/999")
    analysis = client.post("/api/analyze", json={"case_id": 999})
    assert detail.status_code == analysis.status_code == 404
    assert detail.json() == analysis.json() == {"detail": "Caso não encontrado."}


@pytest.mark.parametrize("case_id,recommendation", [(1, "DEFESA"), (2, "ACORDO")])
def test_analysis_exposes_b1_contract_and_mock_provenance(client, case_id, recommendation):
    response = client.post("/api/analyze", json={"case_id": case_id})
    assert response.status_code == 200
    body = response.json()
    assert body["case_id"] == case_id
    assert body["data_mode"] == "mock"
    assert body["warnings"]
    policy = body["policy"]
    assert policy["recommendation"] == recommendation
    assert 0 <= policy["confidence_score"] <= 1
    if recommendation == "ACORDO":
        pricing = policy["settlement_pricing"]
        assert 0 <= pricing["floor"] <= pricing["target"] <= pricing["ceiling"]
    else:
        assert policy["settlement_pricing"] is None


@pytest.mark.parametrize("payload", [{}, {"case_id": 1, "confidence_score": 0}])
def test_analysis_rejects_missing_case_and_unspecified_input_fields(client, payload):
    assert client.post("/api/analyze", json=payload).status_code == 422


def test_analysis_does_not_change_case_state(client):
    before = client.get("/api/cases/1").json()
    client.post("/api/analyze", json={"case_id": 1})
    assert client.get("/api/cases/1").json() == before


def test_overview_keeps_spec_fields_and_does_not_claim_real_savings(client):
    response = client.get("/api/monitoring/overview")
    assert response.status_code == 200
    overview = response.json()
    assert overview["total_cases"] == client.get("/api/cases").json()["total"]
    assert overview["adherence_rate"] == 0
    assert overview["total_cost_avoidance"] == 0
    assert overview["avg_negotiation_time_days"] == 0
    assert overview["active_lawyers_count"] == 0
    assert overview["partner_law_firms_count"] == 0
    assert overview["data_mode"] == "mock"


def test_b1_and_b4_services_can_be_connected_without_changing_http_routes(app):
    seen = []

    class AnalysisAdapter:
        async def analyze(self, case):
            seen.append(case.id)
            return AnalyzeResponse(
                case_id=case.id,
                policy=PolicyResult(
                    recommendation="ACORDO",
                    reasoning_code="ML_ZONA_CINZENTA",
                    confidence_score=0.6,
                    risk_level="MEDIO",
                    applied_rules=["Fixture exclusiva do teste de integração."],
                ),
                explanation="Resposta do serviço injetado no teste.",
                warnings=[],
                data_mode="mock",
            )

    class MonitoringAdapter:
        async def overview(self):
            return MonitoringOverviewResponse(
                total_cases=12,
                adherence_rate=0.75,
                total_cost_avoidance=500,
                avg_negotiation_time_days=3,
                active_lawyers_count=4,
                partner_law_firms_count=2,
                data_mode="mock",
            )

    app.dependency_overrides[get_analysis_service] = AnalysisAdapter
    app.dependency_overrides[get_monitoring_service] = MonitoringAdapter
    with TestClient(app) as client:
        assert client.post("/api/analyze", json={"case_id": 999}).status_code == 404
        assert seen == []
        response = client.post("/api/analyze", json={"case_id": 1}).json()
        assert response["policy"]["reasoning_code"] == "ML_ZONA_CINZENTA"
        assert seen == [1]
        assert client.get("/api/monitoring/overview").json()["total_cases"] == 12


@pytest.mark.parametrize("origin", ["http://localhost:5173", "http://127.0.0.1:5173"])
def test_cors_allows_frontend_preflight(client, origin):
    response = client.options(
        "/api/analyze",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    assert "access-control-allow-credentials" not in response.headers


def test_cors_does_not_authorize_unconfigured_origin(client):
    response = client.get("/api/cases", headers={"Origin": "https://example.invalid"})
    assert "access-control-allow-origin" not in response.headers


def test_cors_can_be_configured_for_a_different_frontend_port(monkeypatch, tmp_path):
    monkeypatch.setenv("SUITS_CORS_ORIGINS", " http://localhost:3000/ , ")
    monkeypatch.setenv("SUITS_DATA_MODE", "mock")
    monkeypatch.setenv("SUITS_DATABASE_PATH", str(tmp_path / "cors.sqlite3"))
    with TestClient(create_app()) as client:
        result = client.get("/api/cases", headers={"Origin": "http://localhost:3000"})
        assert result.headers["access-control-allow-origin"] == "http://localhost:3000"
        result = client.get("/api/cases", headers={"Origin": "http://localhost:5173"})
        assert "access-control-allow-origin" not in result.headers


def test_swagger_and_openapi_publish_all_phase_one_contracts(client):
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert set(schema["paths"]) >= {
        "/api/cases", "/api/cases/{case_id}", "/api/analyze", "/api/monitoring/overview"
    }
    analyze = schema["paths"]["/api/analyze"]["post"]
    request = analyze["requestBody"]["content"]["application/json"]["schema"]
    assert request["$ref"].endswith("/AnalyzeRequest")
    assert "404" in analyze["responses"]
    properties = schema["components"]["schemas"]["PolicyResult"]["properties"]
    assert "confidence_score_semantics=loss_probability" in properties["confidence_score"]["description"]
    assert properties["confidence_score_semantics"]["default"] == "unspecified"
