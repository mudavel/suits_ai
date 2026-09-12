"""Gera o contrato HTTP sem iniciar o lifespan, ler documentos ou acessar a rede."""

import json
from pathlib import Path

from backend.config import Settings
from backend.main import create_app


if __name__ == "__main__":
    target = Path(__file__).with_name("openapi.json")
    target.write_text(json.dumps(create_app(Settings()).openapi(), ensure_ascii=False,
        sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(target)
