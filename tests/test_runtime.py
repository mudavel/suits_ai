"""Configuration must follow the repository when its working directory changes."""

from unittest.mock import Mock

import pytest

import run
from src.backend import config


@pytest.mark.parametrize("process_port,expected_port", [(None, 8123), ("8234", 8234)])
def test_launcher_reads_root_env_before_server_options(tmp_path, monkeypatch, process_port, expected_port):
    root = tmp_path / "repo"
    root.mkdir()
    (root / ".env").write_text("API_HOST=127.0.0.1\nAPI_PORT=8123\nAPP_ENV=production\n", encoding="utf-8")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / ".env").write_text("API_PORT=9999\n", encoding="utf-8")
    monkeypatch.chdir(elsewhere)
    monkeypatch.setattr(run, "__file__", str(root / "run.py"))
    for name in ("API_HOST", "API_PORT", "APP_ENV"):
        # Restore variables that dotenv mutates as well as our explicit overrides.
        monkeypatch.setenv(name, "")
        monkeypatch.delenv(name)
    if process_port is not None:
        monkeypatch.setenv("API_PORT", process_port)
    server = Mock()
    monkeypatch.setattr(run.uvicorn, "run", server)

    run.main()

    server.assert_called_once_with("src.backend.main:app", host="127.0.0.1", port=expected_port, reload=False)


def test_settings_keep_explicit_database_from_root_env(tmp_path, monkeypatch):
    root = tmp_path / "repo"
    root.mkdir()
    existing = tmp_path / "existing.sqlite3"
    (root / ".env").write_text(f"SUITS_DATABASE_PATH={existing.as_posix()}\n", encoding="utf-8")
    elsewhere = tmp_path / "elsewhere"
    elsewhere.mkdir()
    (elsewhere / ".env").write_text("SUITS_DATABASE_PATH=wrong.sqlite3\n", encoding="utf-8")
    monkeypatch.chdir(elsewhere)
    monkeypatch.setattr(config, "REPO_ROOT", root)
    monkeypatch.setenv("SUITS_DATABASE_PATH", "")
    monkeypatch.delenv("SUITS_DATABASE_PATH")

    assert config.Settings.from_env().database_path == existing
