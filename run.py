"""Orquestrador unificado de execução da aplicação Suits AI (EnterOS)."""

import os
import sys
import uvicorn

# Garante que o diretório raiz está no path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def main():
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("APP_ENV", "development").lower() == "development"
    
    print(f"🚀 Iniciando Suits AI Backend em http://{host}:{port}")
    print(f"📖 Documentação interativa Swagger: http://{host}:{port}/docs")
    
    uvicorn.run("backend.main:app", host=host, port=port, reload=reload)

if __name__ == "__main__":
    main()
