"""Orquestrador unificado de execução da aplicação Suits AI (EnterOS)."""

import os
import sys
from pathlib import Path

import uvicorn
from dotenv import load_dotenv

# Garante que o diretório raiz está no path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def main():
    load_dotenv(Path(__file__).resolve().parent / ".env", override=False)
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("APP_ENV", "development").lower() == "development"
    
    print(f"🚀 Iniciando Suits AI Backend em http://{host}:{port}")
    print(f"📖 Documentação interativa Swagger: http://{host}:{port}/docs")
    
    uvicorn.run("src.backend.main:app", host=host, port=port, reload=reload)

if __name__ == "__main__":
    main()
