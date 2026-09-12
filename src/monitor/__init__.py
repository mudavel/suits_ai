"""Módulo de monitoramento, governança e simulação contrafactual."""

from src.monitor.schemas import (
    LawFirmAdherence,
    AdherenceMetrics,
    FinancialEffectiveness,
    GovernanceOverview,
    EffectivenessMetrics,
    SubsidiesDiagnostic,
)
from src.monitor.counterfactual import (
    calculate_historical_baseline,
    run_counterfactual_simulation,
    simulate_uf_savings,
)
from src.monitor.metrics_adherence import calculate_adherence_metrics
from src.monitor.metrics_effectiveness import calculate_effectiveness_metrics
from src.monitor.generator import (
    PARTNER_LAW_FIRMS,
    OVERRIDE_REASONS,
    enrich_dataset_with_governance,
    generate_governance_summary_json,
)

__all__ = [
    "LawFirmAdherence",
    "AdherenceMetrics",
    "FinancialEffectiveness",
    "GovernanceOverview",
    "EffectivenessMetrics",
    "SubsidiesDiagnostic",
    "calculate_historical_baseline",
    "run_counterfactual_simulation",
    "simulate_uf_savings",
    "calculate_adherence_metrics",
    "calculate_effectiveness_metrics",
    "PARTNER_LAW_FIRMS",
    "OVERRIDE_REASONS",
    "enrich_dataset_with_governance",
    "generate_governance_summary_json",
]
