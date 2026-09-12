"""Exemplos sintéticos para integração de UI; não usam a base nem os ZIPs."""

from backend.schemas import (
    AnalyzeResponse,
    CaseDetail,
    CaseDocument,
    CaseListResponse,
    CaseStatus,
    CaseSummary,
    MonitoringOverviewResponse,
    PolicyResult,
    SettlementPricing,
    SubsidyPresence,
)


def demo_cases() -> list[CaseDetail]:
    # Objetos novos por chamada: um consumidor não altera o próximo resultado.
    return [
        CaseDetail(
            id=1,
            case_number="DEMO-001",
            title="Exemplo fictício com documentos bancários",
            uf="SP",
            sub_issue="Contratação contestada",
            cause_value=10000,
            status="EM_ANALISE",
            recommendation="DEFESA",
            risk_level="BAIXO",
            subsidies=SubsidyPresence(
                has_contract=True,
                has_statement=True,
                has_credit_receipt=True,
                has_dossier=False,
                has_debt_evolution=False,
                has_referenced_report=False,
            ),
            claims=["Pedido fictício de declaração de inexistência do contrato."],
            documents=[
                CaseDocument(
                    id="demo-001-inicial",
                    name="Petição inicial — exemplo fictício",
                    category="AUTOS",
                    document_type="PETICAO_INICIAL",
                    text_excerpt="Texto simulado: a parte autora contesta a contratação.",
                ),
                CaseDocument(
                    id="demo-001-contrato",
                    name="Contrato — exemplo fictício",
                    category="SUBSIDIO",
                    document_type="CONTRATO",
                    text_excerpt="Texto simulado de contrato, sem assinatura ou CPF real.",
                ),
                CaseDocument(
                    id="demo-001-extrato",
                    name="Extrato — exemplo fictício",
                    category="SUBSIDIO",
                    document_type="EXTRATO",
                    text_excerpt="Texto simulado de lançamento de crédito.",
                ),
                CaseDocument(
                    id="demo-001-comprovante",
                    name="Comprovante de crédito — exemplo fictício",
                    category="SUBSIDIO",
                    document_type="COMPROVANTE_CREDITO",
                    text_excerpt="Texto simulado de comprovante de transferência.",
                ),
            ],
            data_mode="mock",
        ),
        CaseDetail(
            id=2,
            case_number="DEMO-002",
            title="Exemplo fictício com documentos pendentes",
            uf="MG",
            sub_issue="Contratação contestada",
            cause_value=15000,
            status="PENDENTE",
            recommendation="ACORDO",
            risk_level="ALTO",
            subsidies=SubsidyPresence(
                has_contract=False,
                has_statement=False,
                has_credit_receipt=False,
                has_dossier=False,
                has_debt_evolution=False,
                has_referenced_report=False,
            ),
            claims=["Pedido fictício de restituição de descontos contestados."],
            documents=[
                CaseDocument(
                    id="demo-002-inicial",
                    name="Petição inicial — exemplo fictício",
                    category="AUTOS",
                    document_type="PETICAO_INICIAL",
                    text_excerpt="Texto simulado: a parte autora relata descontos contestados.",
                )
            ],
            data_mode="mock",
        ),
    ]


class MockCaseService:
    async def list_cases(
        self, *, page: int, page_size: int, status: CaseStatus | None, uf: str | None
    ) -> CaseListResponse:
        cases = [
            case
            for case in demo_cases()
            if (status is None or case.status == status)
            and (uf is None or case.uf == uf.upper())
        ]
        start = (page - 1) * page_size
        return CaseListResponse(
            items=[
                CaseSummary.model_validate(case.model_dump())
                for case in cases[start : start + page_size]
            ],
            total=len(cases),
            page=page,
            page_size=page_size,
            total_pages=(len(cases) + page_size - 1) // page_size,
            data_mode="mock",
        )

    async def get_case(self, case_id: int) -> CaseDetail | None:
        return next((case for case in demo_cases() if case.id == case_id), None)


class MockAnalysisService:
    async def analyze(self, case: CaseDetail) -> AnalyzeResponse:
        # Fixtures escolhidas por ID, sem implementar regras ou um modelo da B1.
        policies = {
            1: PolicyResult(
                recommendation="DEFESA",
                reasoning_code="CADEIA_COMPLETA",
                confidence_score=0.1,
                confidence_score_semantics="loss_probability",
                risk_level="BAIXO",
                applied_rules=["MOCK: exemplo de resposta com recomendação de defesa."],
            ),
            2: PolicyResult(
                recommendation="ACORDO",
                reasoning_code="POWER_PAIR_AUSENTE",
                confidence_score=0.8,
                confidence_score_semantics="loss_probability",
                risk_level="ALTO",
                settlement_pricing=SettlementPricing(
                    floor=1500, target=2500, ceiling=4000, expected_loss=6000
                ),
                applied_rules=["MOCK: exemplo de resposta com faixa de negociação."],
            ),
        }
        return AnalyzeResponse(
            case_id=case.id,
            policy=policies[case.id],
            explanation=(
                "Parecer fictício para desenvolvimento da interface. "
                "A recomendação e os valores são exemplos fixos, "
                "sem avaliação do motor de política ou chamada de IA."
            ),
            warnings=[
                "Não usar os valores simulados para decisões sobre processos reais.",
                "Presença de documento não comprova autenticidade ou validade.",
            ],
            data_mode="mock",
        )


class MockMonitoringService:
    async def overview(self) -> MonitoringOverviewResponse:
        return MonitoringOverviewResponse(
            total_cases=len(demo_cases()),
            adherence_rate=0,
            total_cost_avoidance=0,
            avg_negotiation_time_days=0,
            active_lawyers_count=0,
            partner_law_firms_count=0,
            data_mode="mock",
        )
