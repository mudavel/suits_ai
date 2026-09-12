from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.backend.config import Settings
from src.backend.routers import analysis, cases, monitoring


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    app = FastAPI(
        title="Suits AI — Backend",
        version="0.1.0",
        description=(
            "Fase 1 da branch 2: contratos HTTP com dados fictícios. "
            "Todas as respostas de dados incluem data_mode=mock. "
            "Não há leitura da base de 60 mil casos ou chamadas à OpenAI nesta fase."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
        allow_credentials=False,
    )
    app.include_router(cases.router)
    app.include_router(analysis.router)
    app.include_router(monitoring.router)
    return app


app = create_app()
