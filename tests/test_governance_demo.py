import sqlite3
import json
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from scripts.seed_governance_demo import DEMO_LAWYERS, seed
from src.backend.config import Settings
from src.backend.main import create_app
from src.backend.config import REPO_ROOT
from scripts.summarize_historical_subsidies import summarize


def test_persisted_demo_is_idempotent_and_does_not_change_operation(tmp_path):
    database = tmp_path / "demo.sqlite3"
    settings = Settings(data_mode="mock", policy_mode="mock", database_path=database)
    with TestClient(create_app(settings)) as client:
        assert client.get("/api/monitoring/lawyers").json() == {"items": [], "is_simulated": True}
        before = client.get("/api/cases").json()
        backup = seed(database)
        assert backup.is_file()
        with sqlite3.connect(backup) as snapshot:
            assert snapshot.execute("SELECT count(*) FROM demo_lawyer_adherence").fetchone()[0] == 0
        seed(database)
        result = client.get("/api/monitoring/lawyers").json()
        assert result["is_simulated"] is True
        assert result["items"] == [dict(zip(("name", "decisions", "adherence", "law_firm"), row)) for row in DEMO_LAWYERS]
        assert client.get("/api/cases").json() == before
        analysis = client.post("/api/analyze", json={"case_id": 1}).json()
        decision = client.post("/api/decisions", json={
            "case_id": 1, "action": "DEFESA", "lawyer_id": "Advogado operacional",
            "law_firm_id": "Escritório operacional", "expected_case_version": 0,
            "analysis_id": analysis["analysis_id"], "override_reason": "Revisão documental do advogado.",
            "idempotency_key": str(uuid4()),
        })
        assert decision.status_code == 201, decision.text
        operation = client.get("/api/monitoring/overview").json()
        assert operation["active_lawyers_count"] == 1
        seed(database)
        assert client.get("/api/monitoring/lawyers").json() == result
        assert client.get("/api/decisions").json()["total"] == 1
        assert client.get("/api/cases/1").json()["status"] == "CONCLUIDO"
    with TestClient(create_app(settings)) as restarted:
        assert restarted.get("/api/monitoring/lawyers").json() == result


def test_seed_rejects_missing_or_unrelated_database(tmp_path):
    missing = tmp_path / "missing.sqlite3"
    with pytest.raises(FileNotFoundError):
        seed(missing)
    assert not missing.exists()
    unrelated = tmp_path / "unrelated.sqlite3"
    with sqlite3.connect(unrelated) as db:
        db.execute("CREATE TABLE unrelated (id INTEGER PRIMARY KEY)")
    with pytest.raises(ValueError, match="base inicializada"):
        seed(unrelated)
    assert not list(tmp_path.glob("*.before-governance-demo-*.sqlite3"))


def test_historical_subsidies_snapshot_matches_all_source_cases():
    snapshot = json.loads((REPO_ROOT / "src/frontend/src/data/historicalSubsidies.json").read_text(encoding="utf-8"))
    assert summarize() == snapshot


@pytest.mark.parametrize("seed_before_start", [False, True])
def test_legacy_lawyer_table_migrates_without_losing_rows(tmp_path, seed_before_start):
    database = tmp_path / "legacy.sqlite3"
    settings = Settings(data_mode="mock", database_path=database)
    with TestClient(create_app(settings)):
        pass
    with sqlite3.connect(database) as db:
        db.execute("DROP TABLE demo_lawyer_adherence")
        db.execute("CREATE TABLE demo_lawyer_adherence (name TEXT PRIMARY KEY, decisions INTEGER NOT NULL, adherence REAL NOT NULL)")
        db.execute("INSERT INTO demo_lawyer_adherence VALUES ('Advogado preservado', 15, .8)")
    if seed_before_start:
        seed(database)
    with TestClient(create_app(settings)) as client:
        rows = client.get("/api/monitoring/lawyers").json()["items"]
        preserved = next(row for row in rows if row["name"] == "Advogado preservado")
        assert preserved == {"name": "Advogado preservado", "decisions": 15, "adherence": .8, "law_firm": None}
        seed(database)
        rows = client.get("/api/monitoring/lawyers").json()["items"]
        assert len(rows) == 6
        assert next(row for row in rows if row["name"] == "Dr. Lucas Ramos")["law_firm"] == "Pinheiro & Associados Advogados"
