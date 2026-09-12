"""Testes unitários exclusivos para a Branch 4 - Governança, Monitoramento e Simulação Contrafactual."""

import os
import json
import pytest
import pandas as pd

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
)


@pytest.fixture
def mock_raw_dataframe():
    """Cria um DataFrame sintético de 100 casos com a mesma estrutura do banco."""
    records = []
    ufs = ["SP", "RJ", "MG", "BA", "AP"]
    sub_issues = ["Golpe", "Genérico"]
    micro_results = ["Improcedência", "Extinção", "Parcial procedência", "Procedência", "Acordo"]
    
    for i in range(100):
        has_contract = 1 if i % 2 == 0 else 0
        has_statement = 1 if i % 3 == 0 else 0
        
        # Na realidade jurídica: sem contrato/extrato = condenação
        if has_contract == 0 and has_statement == 0:
            res = "Procedência" if i % 2 == 0 else "Parcial procedência"
            condemnation_val = 10000.0
        elif has_contract == 1 and has_statement == 1:
            res = "Improcedência" if i % 2 == 0 else "Extinção"
            condemnation_val = 0.0
        else:
            res = micro_results[i % len(micro_results)]
            condemnation_val = 10000.0 if res in ["Procedência", "Parcial procedência"] else 0.0
            
        records.append({
            "Número do processo": f"0000{i:03d}-2026.8.00.0000",
            "UF": ufs[i % len(ufs)],
            "Assunto": "Não reconhece operação",
            "Sub-assunto": sub_issues[i % len(sub_issues)],
            "Resultado macro": "Êxito" if condemnation_val == 0 else "Não Êxito",
            "Resultado micro": res,
            "Valor da causa": 15000.0,
            "Valor da condenação/indenização": condemnation_val,
            "Contrato": has_contract,
            "Extrato": has_statement,
            "Comprovante de crédito": 1 if i % 4 == 0 else 0,
            "Dossiê": 1,
            "Demonstrativo de evolução da dívida": 1,
            "Laudo referenciado": 1,
        })
    return pd.DataFrame(records)


def test_calculate_historical_baseline(mock_raw_dataframe):
    """Testa se o cálculo do baseline histórico está correto."""
    baseline = calculate_historical_baseline(mock_raw_dataframe)
    assert baseline["total_cases"] == 100
    assert baseline["total_condemnations"] > 0
    assert baseline["total_historical_losses"] > 0
    assert baseline["avg_loss_per_condemned"] == 10000.0


def test_run_counterfactual_simulation(mock_raw_dataframe):
    """Testa a simulação contrafactual e a curva de sensibilidade."""
    sim = run_counterfactual_simulation(
        mock_raw_dataframe,
        target_discount_rate=0.50,
        author_acceptance_rate=0.60,
        lawyer_adherence_rate=0.90,
    )
    assert "baseline" in sim
    assert sim["eligible_for_settlement_count"] > 0
    assert sim["net_cost_avoidance"] > 0
    assert sim["roi_multiple"] > 1.0
    assert len(sim["sensitivity_curve"]) == 6  # 30% a 80%


def test_enrich_dataset_with_governance(mock_raw_dataframe):
    """Testa o enriquecimento da base com escritórios e flags de governança."""
    enriched = enrich_dataset_with_governance(mock_raw_dataframe.copy(), seed=42)
    
    assert "partner_law_firm" in enriched.columns
    assert "lawyer_name" in enriched.columns
    assert "policy_recommendation" in enriched.columns
    assert "lawyer_decision" in enriched.columns
    assert "is_override" in enriched.columns
    assert "settlement_target_value" in enriched.columns
    
    # Valida escritórios atribuídos
    firm_names = [f["name"] for f in PARTNER_LAW_FIRMS]
    assert all(f in firm_names for f in enriched["partner_law_firm"].unique())
    
    # Valida que overrides possuem justificativas cadastradas
    overrides = enriched[enriched["is_override"]]
    if len(overrides) > 0:
        assert overrides["override_reason"].notna().all()


def test_governance_artifacts_exist():
    """Valida se os arquivos gerados pela pipeline da Fase 1 em CSV existem e são válidos."""
    firms_path = "data/governance_law_firms.csv"
    sample_path = "data/cases_sample_120.csv"
    sensitivity_path = "data/governance_sensitivity_curve.csv"
    
    assert os.path.exists(firms_path), "Arquivo governance_law_firms.csv não foi gerado!"
    assert os.path.exists(sample_path), "Arquivo cases_sample_120.csv não foi gerado!"
    assert os.path.exists(sensitivity_path), "Arquivo governance_sensitivity_curve.csv não foi gerado!"
    
    df_firms = pd.read_csv(firms_path)
    assert len(df_firms) == 5
    assert "firm_name" in df_firms.columns
    assert "adherence_rate" in df_firms.columns
    
    df_sample = pd.read_csv(sample_path)
    assert len(df_sample) == 120
    assert "partner_law_firm" in df_sample.columns


def test_calculate_adherence_metrics(mock_raw_dataframe):
    """Testa o cálculo da suíte completa de métricas de aderência A01-A10."""
    from src.monitor.metrics_adherence import calculate_adherence_metrics
    
    enriched = enrich_dataset_with_governance(mock_raw_dataframe.copy(), seed=42)
    metrics = calculate_adherence_metrics(enriched)
    
    assert "A01_overall_adherence_rate" in metrics
    assert "A02_overall_override_rate" in metrics
    assert "A03_law_firms_adherence" in metrics
    assert "A04_lawyers_adherence" in metrics
    assert "A05_override_reasons_distribution" in metrics
    assert "A10_governance_score" in metrics
    
    assert 0 <= metrics["A01_overall_adherence_rate"] <= 100
    assert 0 <= metrics["A02_overall_override_rate"] <= 100
    assert len(metrics["A03_law_firms_adherence"]) > 0
    assert len(metrics["A05_override_reasons_distribution"]) > 0


def test_calculate_effectiveness_metrics(mock_raw_dataframe):
    """Testa o cálculo da suíte de métricas de efetividade e ROI E01-E10."""
    from src.monitor.metrics_effectiveness import calculate_effectiveness_metrics
    
    enriched = enrich_dataset_with_governance(mock_raw_dataframe.copy(), seed=42)
    metrics = calculate_effectiveness_metrics(
        enriched,
        target_discount_rate=0.50,
        author_acceptance_rate=0.65,
        lawyer_adherence_rate=0.90,
        court_costs_and_fees_pct=0.15,
    )
    
    assert "E01_gross_cost_avoidance" in metrics
    assert "E02_net_cost_avoidance" in metrics
    assert "E03_savings_margin_percentage" in metrics
    assert "E04_roi_multiple" in metrics
    assert "E08_sensitivity_curve" in metrics
    assert len(metrics["E08_sensitivity_curve"]) == 8  # 30% a 90%
    assert metrics["E04_roi_multiple"] > 0


def test_simulate_uf_savings(mock_raw_dataframe):
    """Testa a simulação contrafactual regionalizada por UF (Desafio 2)."""
    from src.monitor.counterfactual import simulate_uf_savings
    
    sp_sim = simulate_uf_savings(mock_raw_dataframe, uf_target="SP")
    assert sp_sim["uf"] == "SP"
    assert sp_sim["total_cases"] > 0
    assert "net_cost_avoidance" in sp_sim
    assert len(sp_sim["sensitivity_curve"]) > 0
    
    # UF inexistente
    xx_sim = simulate_uf_savings(mock_raw_dataframe, uf_target="XX")
    assert xx_sim["uf"] == "XX"
    assert xx_sim["total_cases"] == 0
    assert xx_sim["net_cost_avoidance"] == 0.0


def test_court_costs_and_fees_increase_savings(mock_raw_dataframe):
    """Testa se a inclusão de honorários de sucumbência aumenta adequadamente o Cost Avoidance."""
    from src.monitor.metrics_effectiveness import calculate_effectiveness_metrics
    
    enriched = enrich_dataset_with_governance(mock_raw_dataframe.copy(), seed=42)
    base_metrics = calculate_effectiveness_metrics(enriched, court_costs_and_fees_pct=0.0)
    with_fees_metrics = calculate_effectiveness_metrics(enriched, court_costs_and_fees_pct=0.15)
    
    assert with_fees_metrics["E01_gross_cost_avoidance"] > base_metrics["E01_gross_cost_avoidance"]
    assert with_fees_metrics["E02_net_cost_avoidance"] > base_metrics["E02_net_cost_avoidance"]



