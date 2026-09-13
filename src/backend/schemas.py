"""Contratos HTTP da branch 2; diferenças entre frentes em INTEGRATION.md."""

from typing import Annotated, Literal
from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, model_validator

Action = Literal["DEFESA", "ACORDO"]
CaseStatus = Literal["PENDENTE", "EM_ANALISE", "CONCLUIDO"]
RiskLevel = Literal["BAIXO", "MEDIO", "ALTO", "CRITICO"]
DataMode = Literal["mock", "real", "artifacts", "manual"]
Money = Annotated[float, Field(ge=0, le=1_000_000_000_000, allow_inf_nan=False)]
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
        description="URL relativa para o PDF original; null quando não há arquivo disponível.",
    )
    page_count: int = 0
    sha256: str | None = None
    extraction_status: Literal["ok", "partial", "unavailable"] = "unavailable"


class SourceReference(BaseModel):
    source_id: str
    document_id: str
    document_name: str
    page: int = Field(ge=1)
    excerpt: str


class ExtractedFact(BaseModel):
    field: str
    value: str
    source: SourceReference


class DocumentCheck(BaseModel):
    code: str
    status: Literal["consistent", "divergent", "not_verified"]
    message: str
    sources: list[SourceReference]


class ScenarioArgument(BaseModel):
    text: str
    sources: list[SourceReference]


class DocumentPage(BaseModel):
    number: int
    text: str


class DocumentContent(BaseModel):
    document: CaseDocument
    pages: list[DocumentPage]
    facts: list[ExtractedFact]


class CaseDetail(CaseSummary):
    claims: list[str]
    documents: list[CaseDocument]
    claimant_name: str | None = None
    defendant_name: str | None = None
    court: str | None = None
    version: int = 0
    facts: list[ExtractedFact] = Field(default_factory=list)
    checks: list[DocumentCheck] = Field(default_factory=list)
    is_simulated: bool = True


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
        "Significado declarado pelo produtor. Pareceres históricos reconhecidos da B1 "
        "usam o significado da regra registrada; outros resultados permanecem unspecified."
    ))
    risk_level: RiskLevel
    settlement_pricing: SettlementPricing | None = None
    applied_rules: list[str] = Field(default_factory=list)
    plain_language_explanation: str = ""
    decision_path: list[str] = Field(default_factory=list)
    forest_consensus_reasons: list[str] = Field(default_factory=list)


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    case_id: int = Field(gt=0, examples=[1])


class AnalyzeResponse(BaseModel):
    case_id: int = Field(gt=0)
    policy: PolicyResult | None
    explanation: str
    warnings: list[str]
    data_mode: DataMode
    analysis_id: UUID | None = None
    case_version: int = 0
    policy_status: Literal["available", "unavailable", "mock"] = "mock"
    generation_mode: Literal["local", "openai", "mock"] = "mock"
    sources: list[SourceReference] = Field(default_factory=list)
    document_checks: list[DocumentCheck] = Field(default_factory=list)
    author_arguments: list[ScenarioArgument] = Field(default_factory=list)
    defense_arguments: list[ScenarioArgument] = Field(default_factory=list)
    created_at: datetime | None = None

    @model_validator(mode="after")
    def describe_legacy_policy_score(self):
        policy = self.policy
        if self.policy_status != "available" or not policy or policy.confidence_score_semantics != "unspecified":
            return self
        # Recognize the persisted B1 rule, rather than interpreting every ACORDO
        # as a loss probability. Keep unknown producers and explicit values intact.
        prefixes = {
            "CADEIA_COMPLETA": "Força Probatória Plena:",
            "DOSSIE_NAO_CONFORME": "Auditoria Probatória: Dossiê Grafotécnico/Facial",
            "FALHA_PROBATORIA": "Falha Probatória Severa:",
            "ML_ZONA_CINZENTA": "Zona Cinzenta Probatória:",
        }
        prefix = prefixes.get(policy.reasoning_code)
        if not prefix or not any(rule.startswith(prefix) for rule in policy.applied_rules):
            return self
        semantics = "loss_probability" if policy.reasoning_code == "ML_ZONA_CINZENTA" and policy.recommendation == "ACORDO" else "recommendation_confidence"
        self.policy = policy.model_copy(update={"confidence_score_semantics": semantics})
        self.warnings = [warning for warning in self.warnings if warning != "B1 não declara a semântica de confidence_score; não apresentar como probabilidade de derrota."]
        return self


class StoredAnalysisResponse(BaseModel):
    case_id: int = Field(gt=0)
    case_version: int = Field(ge=0)
    status: Literal["available", "stale", "not_found"]
    analysis: AnalyzeResponse | None = Field(description=(
        "Último parecer persistido, sem executar IA. stale indica versão diferente "
        "do caso; o parecer é histórico e não deve definir a alçada atual."
    ))


class LawyerAdherenceRow(BaseModel):
    name: str
    law_firm: str | None = None
    decisions: int = Field(ge=0)
    adherence: Probability


class LawyerAdherenceResponse(BaseModel):
    items: list[LawyerAdherenceRow]
    is_simulated: Literal[True] = True


class MonitoringOverviewResponse(BaseModel):
    total_cases: int = Field(ge=0)
    adherence_rate: Probability | None
    total_cost_avoidance: Money | None
    avg_negotiation_time_days: float | None = Field(ge=0, allow_inf_nan=False)
    active_lawyers_count: int = Field(ge=0)
    partner_law_firms_count: int = Field(ge=0)
    data_mode: DataMode
    metrics_status: Literal["mock", "partial", "available"] = "mock"


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ChatRequest(RequestModel):
    case_id: int = Field(gt=0)
    message: str = Field(min_length=1, max_length=4000)
    session_id: UUID | None = None


class ChatResponse(BaseModel):
    case_id: int
    session_id: UUID
    answer: str
    sources: list[SourceReference]
    generation_mode: Literal["local", "openai"]
    warnings: list[str]


class ChatHistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    sources: list[SourceReference]
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    case_id: int
    session_id: UUID
    messages: list[ChatHistoryMessage]


class OffsetPage(BaseModel):
    total: int = Field(ge=0)
    limit: int = Field(ge=1, le=100)
    offset: int = Field(ge=0)
    has_more: bool


class ChatSessionSummary(BaseModel):
    session_id: UUID
    case_id: int = Field(gt=0)
    title: str = Field(description="Início da primeira mensagem do usuário, sem geração por IA.")
    message_count: int = Field(ge=0)
    created_at: datetime
    updated_at: datetime


class ChatSessionListResponse(OffsetPage):
    items: list[ChatSessionSummary]


class ScenariosResponse(BaseModel):
    case_id: int
    author_arguments: list[ScenarioArgument]
    defense_arguments: list[ScenarioArgument]
    judicial_outlook: str
    limitations: list[str]
    generation_mode: Literal["local", "openai"]


class StrategyRequest(RequestModel):
    case_id: int = Field(gt=0)
    analysis_id: UUID
    expected_case_version: int = Field(ge=0)
    action: Action
    settlement_amount: Money | None = None
    rationale: str | None = Field(default=None, min_length=5, max_length=2000)

    @model_validator(mode="after")
    def validate_amount(self):
        if self.action == "ACORDO":
            if self.settlement_amount is None or self.settlement_amount <= 0:
                raise ValueError("Informe settlement_amount positivo para acordo.")
            validate_cents(self.settlement_amount)
        elif self.settlement_amount is not None:
            raise ValueError("Defesa não aceita settlement_amount.")
        return self


class StrategyResponse(BaseModel):
    strategy_id: UUID
    case_id: int
    case_version: int
    analysis_id: UUID
    action: Action
    settlement_amount: Money | None
    rationale: str | None
    created_at: datetime


class StoredStrategyResponse(BaseModel):
    status: Literal["available", "stale", "not_found"]
    strategy: StrategyResponse | None


class DraftRequest(RequestModel):
    case_id: int = Field(gt=0)
    action: Action
    settlement_amount: Money | None = None
    format: Literal["formal", "whatsapp"] = "formal"
    strategy_id: UUID | None = None

    @model_validator(mode="after")
    def validate_action(self):
        if self.action == "ACORDO":
            if self.settlement_amount is None or self.settlement_amount <= 0:
                raise ValueError("Informe settlement_amount positivo para acordo.")
            validate_cents(self.settlement_amount)
        elif self.settlement_amount is not None or self.format == "whatsapp":
            raise ValueError("Defesa não aceita valor de acordo ou formato WhatsApp.")
        return self


class DraftResponse(BaseModel):
    draft_id: UUID
    case_id: int
    status: Literal["review_required"] = "review_required"
    document_type: str
    title: str
    content_markdown: str
    attached_subsidies: list[str]
    sources: list[SourceReference]
    generation_mode: Literal["local", "openai"]
    created_at: datetime
    analysis_id: UUID | None = None
    case_version: int | None = None
    strategy: StrategyResponse | None = None


class DraftSummary(BaseModel):
    draft_id: UUID
    case_id: int = Field(gt=0)
    status: Literal["review_required"]
    document_type: str
    title: str
    generation_mode: Literal["local", "openai"]
    created_at: datetime
    analysis_id: UUID | None = None
    strategy: StrategyResponse | None = None


class DraftListResponse(OffsetPage):
    items: list[DraftSummary]


class ExportRequest(RequestModel):
    draft_id: UUID
    format: Literal["pdf", "html"] = "pdf"
    content_markdown: str | None = Field(default=None, min_length=1, max_length=60000)


class NegotiationRequest(RequestModel):
    case_id: int = Field(gt=0)
    proposed_amount: Money

    @model_validator(mode="after")
    def validate_amount(self):
        validate_cents(self.proposed_amount)
        return self


class NegotiationResponse(BaseModel):
    case_id: int
    status: Literal["SEM_POLITICA", "SEM_FAIXA", "ABAIXO_PISO", "NA_FAIXA", "ACIMA_TETO"]
    proposed_amount: Money
    within_ceiling: bool | None
    requires_approval: bool
    pricing: SettlementPricing | None
    explanation: str


class DecisionRequest(RequestModel):
    case_id: int = Field(gt=0)
    action: Action
    settlement_amount: Money | None = None
    lawyer_id: str = Field(min_length=1, max_length=100)
    law_firm_id: str = Field(min_length=1, max_length=100)
    expected_case_version: int = Field(ge=0)
    analysis_id: UUID | None = None
    override_reason: str | None = Field(default=None, min_length=5, max_length=2000)
    idempotency_key: UUID = Field(default_factory=uuid4)
    draft_id: UUID | None = None
    reviewed_content_markdown: Annotated[str, StringConstraints(strip_whitespace=False)] | None = Field(default=None, min_length=1, max_length=60000)

    @model_validator(mode="after")
    def validate_amount(self):
        if bool(self.draft_id) != bool(self.reviewed_content_markdown):
            raise ValueError("Informe a minuta e seu texto revisado em conjunto.")
        if self.reviewed_content_markdown is not None and not self.reviewed_content_markdown.strip():
            raise ValueError("O texto revisado não pode estar vazio.")
        if self.action == "ACORDO":
            if self.settlement_amount is None or self.settlement_amount <= 0:
                raise ValueError("Informe settlement_amount positivo para acordo.")
            validate_cents(self.settlement_amount)
        elif self.settlement_amount is not None:
            raise ValueError("Defesa não aceita settlement_amount.")
        return self


class DecisionResponse(BaseModel):
    decision_id: UUID
    case_id: int
    action: Action
    settlement_amount: Money | None
    is_override: bool | None
    case_version: int
    created_at: datetime


class DecisionRecord(BaseModel):
    decision: DecisionResponse
    registration: DecisionRequest
    analysis: AnalyzeResponse | None


class DecisionListResponse(BaseModel):
    items: list[DecisionRecord]
    total: int = Field(ge=0)
    limit: int = Field(ge=1, le=200)
    offset: int = Field(ge=0)
    has_more: bool


class CaseCreateRequest(RequestModel):
    case_number: str = Field(min_length=3, max_length=100)
    title: str = Field(min_length=3, max_length=200)
    uf: UF
    sub_issue: str = Field(min_length=3, max_length=200)
    cause_value: Money = Field(gt=0, description="Valor da causa positivo, em reais, exigido pelo motor da B1.")
    claimant_name: str = Field(min_length=3, max_length=200)
    defendant_name: str = Field(min_length=3, max_length=200)
    claims: list[str] = Field(min_length=1, max_length=20)


class MetricsResponse(BaseModel):
    status: Literal["pending_integration"] = "pending_integration"
    decision_count: int
    indicators: list[dict] = Field(default_factory=list)
    message: str = "Aguardando os indicadores validados da branch 4."


class SubsidiesInventoryResponse(BaseModel):
    total_cases: int = Field(ge=0)
    missing_by_type: dict[Literal[
        "has_contract", "has_statement", "has_credit_receipt", "has_dossier",
        "has_debt_evolution", "has_referenced_report"
    ], Annotated[int, Field(ge=0)]]
    data_mode: DataMode
    scope: Literal["document_inventory"] = "document_inventory"


def validate_cents(value: float):
    amount = Decimal(str(value))
    if amount != amount.quantize(Decimal("0.01")):
        raise ValueError("Valores monetários devem ter no máximo duas casas decimais.")


class ErrorResponse(BaseModel):
    detail: str
