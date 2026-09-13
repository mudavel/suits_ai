from src.backend.schemas import LawyerAdherenceResponse, MetricsResponse, MonitoringOverviewResponse, SubsidiesInventoryResponse


class OperationalMonitoring:
    def __init__(self, store):
        self.store = store

    async def overview(self) -> MonitoringOverviewResponse:
        counts = await self.store.counts()
        mock = self.store.data_mode == "mock"
        return MonitoringOverviewResponse(
            total_cases=counts["total_cases"],
            active_lawyers_count=counts["active_lawyers_count"],
            partner_law_firms_count=counts["partner_law_firms_count"],
            adherence_rate=0 if mock else None,
            total_cost_avoidance=0 if mock else None,
            avg_negotiation_time_days=0 if mock else None,
            data_mode=self.store.data_mode,
            metrics_status="mock" if mock else "partial",
        )

    async def adherence(self) -> MetricsResponse:
        return MetricsResponse(decision_count=(await self.store.counts())["decision_count"])

    async def lawyers(self) -> LawyerAdherenceResponse:
        return LawyerAdherenceResponse(items=await self.store.demo_lawyer_adherence())

    async def effectiveness(self) -> MetricsResponse:
        return MetricsResponse(decision_count=(await self.store.counts())["decision_count"])

    async def subsidies(self) -> SubsidiesInventoryResponse:
        # Inventário operacional dos documentos; indicadores financeiros pertencem à B4.
        page = 1
        totals = {}
        total_cases = 0
        while True:
            result = await self.store.list_cases(page=page, page_size=100, status=None, uf=None)
            total_cases = result.total
            for case in result.items:
                for flag, present in case.subsidies.model_dump().items():
                    totals[flag] = totals.get(flag, 0) + int(not present)
            if page >= result.total_pages:
                break
            page += 1
        return SubsidiesInventoryResponse(
            total_cases=total_cases,
            missing_by_type=totals,
            data_mode=self.store.data_mode,
        )
