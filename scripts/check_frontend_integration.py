"""Exercise the actual JS client against a temporary local FastAPI instance.

Run from the repository with the backend virtualenv's Python. No API key,
existing SQLite, running backend, or paid generation is used.
"""
import os
import socket
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ["SUITS_AI_MODE"] = "local"

import uvicorn
from pypdf import PdfReader
from src.backend.config import Settings
from src.backend.main import create_app


def main():
    with tempfile.TemporaryDirectory(prefix="suits-frontend-") as directory:
        folder = Path(directory)
        settings = Settings(ai_mode="local", policy_mode="unavailable", database_path=folder / "test.sqlite3")
        listener = socket.socket()
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
        server = uvicorn.Server(uvicorn.Config(create_app(settings), log_level="error"))
        thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
        thread.start()
        try:
            for _ in range(200):
                if server.started or not thread.is_alive():
                    break
                time.sleep(0.05)
            if not server.started:
                raise RuntimeError("Backend de teste não iniciou.")
            env = {**os.environ, "SUITS_TEST_API_URL": f"http://127.0.0.1:{port}", "SUITS_ISOLATED_TEST": "1", "SUITS_TEST_PDF_PATH": str(folder / "edited.pdf")}
            result = subprocess.run(["node", "--test", "test/integration.test.js"], cwd=ROOT / "src/frontend", env=env, check=False)
            if result.returncode:
                return result.returncode
            text = "\n".join(page.extract_text() for page in PdfReader(folder / "edited.pdf").pages)
            assert "MARCADOR QA FRONTEND 2026" in text
            print("PDF exportado: texto revisado confirmado com pypdf.")
            return 0
        finally:
            server.should_exit = True
            thread.join(timeout=10)
            listener.close()


if __name__ == "__main__":
    sys.exit(main())
