from fastapi import APIRouter

from backend.dependencies import Monitoring
from backend.schemas import MonitoringOverviewResponse

router = APIRouter(prefix="/api/monitoring", tags=["Monitoramento"])


@router.get(
    "/overview",
    response_model=MonitoringOverviewResponse,
    summary="Consultar visão geral simulada",
)
async def overview(monitoring: Monitoring) -> MonitoringOverviewResponse:
    return await monitoring.overview()
