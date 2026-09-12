"""Schemas Pydantic para contratos de dados do Cockpit de Governança, Aderência e Efetividade (EnterOS).

Distingue explicitamente:
1. Projeção Contrafactual (Treinada nos 60.000 casos históricos)
2. Operação em Tempo Real (Decisões transacionais e casos novos)
"""

from typing import Dict, List, Optional, Any, Literal
from pydantic import BaseModel, Field


class LawFirmAdherence(BaseModel):
    firm_name: str
    total_assigned: int
    adherent_decisions: int
    overrides_count: int
    adherence_rate: float
    agreed_deals_count: int
    contested_cases_count: int
    top_override_reason: str


class LawyerAdherence(BaseModel):
    lawyer_name: str
    firm_name: str
    total_cases: int
    adherence_rate: float
    overrides_count: int


class OverrideReasonDistribution(BaseModel):
    reason: str
    count: int
    percentage: float


class AdherenceMetrics(BaseModel):
    global_adherence_rate: float
    total_cases_analyzed: int
    total_agreed_recommendations: int
    total_defense_recommendations: int
    total_overrides: int
    override_rate: float
    law_firms: List[LawFirmAdherence]
    top_lawyers: List[LawyerAdherence]
    override_reasons: List[OverrideReasonDistribution]


class FinancialEffectiveness(BaseModel):
    baseline_historical_losses: float
    policy_actual_cost: float
    total_cost_avoidance: float
    savings_percentage: float
    avg_settlement_cost: float
    avg_judgment_cost: float
    roi_multiple: float


class AcceptanceSensitivity(BaseModel):
    acceptance_rate: float
    annual_cost_avoidance: float
    total_agreements_signed: int
    net_savings_margin: float


class EffectivenessMetrics(BaseModel):
    financial: FinancialEffectiveness
    conversion_rate: float
    monthly_trend: List[Dict[str, Any]]
    savings_by_uf: List[Dict[str, Any]]
    sensitivity_curve: List[AcceptanceSensitivity]


class SubsidyBottleneck(BaseModel):
    subsidy_type: str
    missing_count: int
    missing_rate: float
    impact_on_risk_increase_pp: float
    top_critical_uf: str


class SubsidiesDiagnostic(BaseModel):
    total_cases: int
    fully_documented_rate: float
    zero_critical_docs_rate: float
    bottlenecks: List[SubsidyBottleneck]


# =====================================================================
# Separação Explícita: Contrafactual (Histórico 60k) vs Realtime (Novos)
# =====================================================================

class HistoricalCounterfactualSummary(BaseModel):
    """Projeção atuarial baseada na massa histórica de 60.000 sentenças."""
    scope: Literal["BASE_HISTORICA_60K"] = "BASE_HISTORICA_60K"
    baseline_total_cases: int = 60000
    baseline_total_losses_brl: float = 192982862.07
    baseline_avg_condemnation_ticket_brl: float = 10658.35
    projected_annual_cost_avoidance_brl: float = 58400000.0
    projected_roi_multiple: float = 2.47
    sensitivity_curve: List[AcceptanceSensitivity] = Field(default_factory=list)


class RealtimeProductionSummary(BaseModel):
    """Métricas operacionais transacionais dos casos em andamento/concluídos."""
    scope: Literal["CASOS_TRANSACIONAIS_REAIS"] = "CASOS_TRANSACIONAIS_REAIS"
    total_new_cases: int = 0
    decisions_recorded: int = 0
    active_lawyers_count: int = 0
    partner_law_firms_count: int = 0
    realized_adherence_rate: float = 0.0
    realized_overrides_count: int = 0
    realized_cost_avoidance_brl: float = 0.0


class GovernanceOverview(BaseModel):
    total_cases: int
    global_adherence_rate: float
    total_cost_avoidance: float
    avg_negotiation_time_days: float
    active_lawyers_count: int
    partner_law_firms_count: int
    roi_multiple: float
    adherence_summary: AdherenceMetrics
    effectiveness_summary: EffectivenessMetrics
    subsidies_diagnostic: SubsidiesDiagnostic
    historical_counterfactual: Optional[HistoricalCounterfactualSummary] = None
    realtime_production: Optional[RealtimeProductionSummary] = None
