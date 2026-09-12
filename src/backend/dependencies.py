"""Pontos de troca dos mocks por serviços reais, sem alterar os routers."""

from typing import Annotated

from fastapi import Depends, HTTPException

from src.backend.schemas import CaseDetail
from src.backend.services.contracts import AnalysisService, CaseService, MonitoringService
from src.backend.services.mocks import (
    MockAnalysisService,
    MockCaseService,
    MockMonitoringService,
)


def get_case_service() -> CaseService:
    return MockCaseService()


def get_analysis_service() -> AnalysisService:
    return MockAnalysisService()


def get_monitoring_service() -> MonitoringService:
    return MockMonitoringService()


Cases = Annotated[CaseService, Depends(get_case_service)]
Analysis = Annotated[AnalysisService, Depends(get_analysis_service)]
Monitoring = Annotated[MonitoringService, Depends(get_monitoring_service)]


async def require_case(case_id: int, cases: CaseService) -> CaseDetail:
    case = await cases.get_case(case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Caso não encontrado.")
    return case
