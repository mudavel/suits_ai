from typing import Protocol

from backend.schemas import (
    AnalyzeResponse,
    CaseDetail,
    CaseListResponse,
    CaseStatus,
    MonitoringOverviewResponse,
)


class CaseService(Protocol):
    async def list_cases(
        self, *, page: int, page_size: int, status: CaseStatus | None, uf: str | None
    ) -> CaseListResponse: ...

    async def get_case(self, case_id: int) -> CaseDetail | None: ...


class AnalysisService(Protocol):
    async def analyze(self, case: CaseDetail) -> AnalyzeResponse: ...


class MonitoringService(Protocol):
    async def overview(self) -> MonitoringOverviewResponse: ...
