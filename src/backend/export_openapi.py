"""Gera o contrato HTTP sem iniciar o lifespan, ler documentos ou acessar a rede."""

import json
import sys
from pathlib import Path

# Garante raiz do repositório no path quando executado diretamente
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.backend.config import Settings
from src.backend.main import create_app


if __name__ == "__main__":
    target = Path(__file__).with_name("openapi.json")
    target.write_text(json.dumps(create_app(Settings()).openapi(), ensure_ascii=False,
        sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(target)
