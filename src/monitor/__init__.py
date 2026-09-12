"""Módulo de monitoramento, governança e simulação contrafactual."""

from src.monitor.schemas import (
    LawFirmAdherence,
    AdherenceMetrics,
    FinancialEffectiveness,
    GovernanceOverview,
)
from src.monitor.counterfactual import (
    calculate_historical_baseline,
    run_counterfactual_simulation,
)
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
    "calculate_historical_baseline",
    "run_counterfactual_simulation",
    "PARTNER_LAW_FIRMS",
    "OVERRIDE_REASONS",
    "enrich_dataset_with_governance",
    "generate_governance_summary_json",
]
