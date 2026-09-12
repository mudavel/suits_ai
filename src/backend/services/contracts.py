from typing import Protocol

from src.backend.schemas import (
    AnalyzeResponse,
    CaseDetail,
    CaseListResponse,
    CaseStatus,
    MonitoringOverviewResponse,
    MetricsResponse,
    NegotiationResponse,
    SubsidiesInventoryResponse,
)


class CaseService(Protocol):
    async def list_cases(
        self, *, page: int, page_size: int, status: CaseStatus | None, uf: str | None
    ) -> CaseListResponse: ...

    async def get_case(self, case_id: int) -> CaseDetail | None: ...


class AnalysisService(Protocol):
    async def analyze(self, case: CaseDetail) -> AnalyzeResponse: ...

    async def negotiate(self, case: CaseDetail, proposed_amount: float) -> NegotiationResponse: ...


class MonitoringService(Protocol):
    async def overview(self) -> MonitoringOverviewResponse: ...

    async def adherence(self) -> MetricsResponse: ...

    async def effectiveness(self) -> MetricsResponse: ...

    async def subsidies(self) -> SubsidiesInventoryResponse: ...
