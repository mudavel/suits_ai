"""Pontos de troca dos mocks por serviços reais, sem alterar os routers."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request

from src.backend.schemas import CaseDetail
from src.backend.services.contracts import AnalysisService, CaseService, MonitoringService


def get_case_service(request: Request) -> CaseService:
    return request.app.state.store


def get_analysis_service(request: Request) -> AnalysisService:
    return request.app.state.analysis


def get_monitoring_service(request: Request) -> MonitoringService:
    return request.app.state.monitoring


Cases = Annotated[CaseService, Depends(get_case_service)]
Analysis = Annotated[AnalysisService, Depends(get_analysis_service)]
Monitoring = Annotated[MonitoringService, Depends(get_monitoring_service)]


async def require_case(case_id: int, cases: CaseService) -> CaseDetail:
    case = await cases.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Caso não encontrado.")
    return case
