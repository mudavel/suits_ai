"""Contratos HTTP da fase 1; extensões e integração documentadas no README."""

from typing import Annotated, Literal

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

Action = Literal["DEFESA", "ACORDO"]
CaseStatus = Literal["PENDENTE", "EM_ANALISE", "CONCLUIDO"]
RiskLevel = Literal["BAIXO", "MEDIO", "ALTO", "CRITICO"]
DataMode = Literal["mock", "real", "artifacts", "manual"]
Money = Annotated[float, Field(ge=0, allow_inf_nan=False)]
Probability = Annotated[float, Field(ge=0, le=1, allow_inf_nan=False)]
UF = Annotated[
    Literal[
        "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO",
        "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR",
        "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
    ],
    BeforeValidator(lambda value: value.upper() if isinstance(value, str) else value),
]


class SubsidyPresence(BaseModel):
    has_contract: bool
    has_statement: bool
    has_credit_receipt: bool
    has_dossier: bool
    has_debt_evolution: bool
    has_referenced_report: bool


class CaseSummary(BaseModel):
    id: int = Field(gt=0)
    case_number: str
    title: str
    uf: UF
    sub_issue: str
    cause_value: Money
    status: CaseStatus
    recommendation: Action | None = None
    risk_level: RiskLevel | None = None
    subsidies: SubsidyPresence
    data_mode: DataMode


class CaseDocument(BaseModel):
    id: str
    name: str
    category: Literal["AUTOS", "SUBSIDIO"]
    document_type: str
    text_excerpt: str | None = None
    download_url: str | None = Field(
        default=None,
        description="Null enquanto o arquivo não estiver disponível para download.",
    )


class CaseDetail(CaseSummary):
    claims: list[str]
    documents: list[CaseDocument]


class CaseListResponse(BaseModel):
    items: list[CaseSummary]
    total: int = Field(ge=0, description="Total após os filtros, antes da paginação.")
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
    total_pages: int = Field(ge=0)
    data_mode: DataMode


class SettlementPricing(BaseModel):
    floor: Money
    target: Money
    ceiling: Money
    expected_loss: Money


class PolicyResult(BaseModel):
    # A branch 1 é dona do motor e do DTO original em src/policy/schemas.py.
    # Este espelho permite publicar o contrato HTTP antes dessa integração.
    recommendation: Action
    reasoning_code: Literal[
        "DOSSIE_NAO_CONFORME",
        "POWER_PAIR_AUSENTE",
        "FALHA_PROBATORIA",
        "USUFRUTO_COMPROVADO",
        "CADEIA_COMPLETA",
        "ML_ZONA_CINZENTA",
    ]
    confidence_score: Probability = Field(
        description=(
            "Score original do motor (0 a 1), sem inversão ou recálculo. "
            "Só representa probabilidade de derrota quando "
            "confidence_score_semantics=loss_probability."
        )
    )
    confidence_score_semantics: Literal[
        "loss_probability", "recommendation_confidence", "unspecified"
    ] = Field(default="unspecified", description=(
        "Significado declarado pelo produtor. Ausência no resultado da B1 ou "
        "em análises antigas permanece unspecified; não inferir a partir da ação."
    ))
    risk_level: RiskLevel
    settlement_pricing: SettlementPricing | None = None
    applied_rules: list[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_id: int = Field(gt=0, examples=[1])


class AnalyzeResponse(BaseModel):
    case_id: int = Field(gt=0)
    policy: PolicyResult | None
    policy_status: Literal["available", "unavailable", "mock"] = "mock"
    explanation: str
    warnings: list[str]
    data_mode: DataMode


class MonitoringOverviewResponse(BaseModel):
    total_cases: int = Field(ge=0)
    adherence_rate: Probability | None
    total_cost_avoidance: Money | None
    avg_negotiation_time_days: float | None = Field(ge=0, allow_inf_nan=False)
    active_lawyers_count: int = Field(ge=0)
    partner_law_firms_count: int = Field(ge=0)
    data_mode: DataMode
    metrics_status: Literal["mock", "partial", "available"] = "mock"


class ErrorResponse(BaseModel):
    detail: str
