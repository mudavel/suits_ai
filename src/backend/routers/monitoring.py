from fastapi import APIRouter

from src.backend.dependencies import Monitoring
from src.backend.schemas import LawyerAdherenceResponse, MonitoringOverviewResponse, MetricsResponse, SubsidiesInventoryResponse

router = APIRouter(prefix="/api/monitoring", tags=["Monitoramento"])


@router.get("/lawyers", response_model=LawyerAdherenceResponse,
            summary="Consultar aderência demonstrativa por advogado persistida no banco")
async def lawyers(monitoring: Monitoring) -> LawyerAdherenceResponse:
    return await monitoring.lawyers()


@router.get(
    "/overview",
    response_model=MonitoringOverviewResponse,
    summary="Consultar visão geral operacional",
)
async def overview(monitoring: Monitoring) -> MonitoringOverviewResponse:
    return await monitoring.overview()


@router.get("/adherence", response_model=MetricsResponse)
async def adherence(monitoring: Monitoring):
    return await monitoring.adherence()


@router.get("/effectiveness", response_model=MetricsResponse)
async def effectiveness(monitoring: Monitoring):
    return await monitoring.effectiveness()


@router.get("/subsidies", response_model=SubsidiesInventoryResponse)
async def subsidies(monitoring: Monitoring):
    return await monitoring.subsidies()
