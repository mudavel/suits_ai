from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from starlette.concurrency import run_in_threadpool

from src.backend.config import Settings
from src.backend.routers import analysis, cases, monitoring
from src.backend.routers import workflow
from src.backend.database.store import Store
from src.backend.services.document_service import DocumentService
from src.backend.services.copilot import Copilot
from src.backend.services.analysis_service import AnalysisService
from src.backend.services.monitoring_service import OperationalMonitoring
from src.backend.services.pdf_service import PdfService
from src.backend.services.mocks import demo_cases


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()

    @asynccontextmanager
    async def lifespan(app):
        documents = DocumentService()
        initial_cases = demo_cases() if settings.data_mode == "mock" else await run_in_threadpool(documents.load_cases, settings.artifacts_dir)
        store = Store(settings.database_path, settings.data_mode)
        await store.initialize(initial_cases)
        copilot = Copilot(settings, documents, store)
        app.state.store, app.state.documents, app.state.copilot = store, documents, copilot
        app.state.analysis = AnalysisService(settings, store, copilot)
        app.state.monitoring, app.state.pdf = OperationalMonitoring(store), PdfService()
        try:
            yield
        finally:
            await copilot.close()

    app = FastAPI(
        title="Suits AI — Backend",
        version="0.2.0",
        lifespan=lifespan,
        description=(
            "Documentos dos casos do hackathon, copiloto, minutas e persistência. "
            "data_mode distingue artifacts, mock e manual; generation_mode identifica local ou openai. "
            "Política e indicadores financeiros ficam indisponíveis até a integração dos motores."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "Authorization"],
        allow_credentials=False,
        expose_headers=["Content-Disposition", "X-PDF-Engine"],
    )
    app.include_router(cases.router)
    app.include_router(analysis.router)
    app.include_router(monitoring.router)
    app.include_router(workflow.router)

    @app.get("/health", tags=["Health"], summary="Health Check")
    async def health_check():
        return {
            "status": "healthy",
            "message": "Processo saudando normalmente. Suits AI — EnterOS Backend v0.2.0",
            "version": "0.2.0",
            "data_mode": settings.data_mode,
        }

    @app.get("/api/health", tags=["Health"], summary="API Health Check")
    async def health_check():
        return {
            "status": "healthy",
            "app": "Suits AI — EnterOS Backend",
            "data_mode": settings.data_mode,
            "policy_mode": settings.policy_mode,
            "ai_mode": settings.ai_mode,
        }

    return app


app = create_app()
