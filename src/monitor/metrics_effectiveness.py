"""Métricas de Efetividade Financeira e ROI (E01–E20) da Política EnterOS.

Métricas Implementadas:
- E01: Cost Avoidance Total Bruto (condenações evitadas em R$)
- E02: Economia Líquida Total (Cost Avoidance - Valores Pagos em Acordos)
- E03: Margem de Economia Percentual sobre Perdas Históricas
- E04: Multiplicador de ROI (Desembolso Evitado / Gasto Efetivo em Acordos)
- E05: Comparativo de Tickets Médios (Acordo Proposto vs Condenação Histórica)
- E06: Deságio Médio Efetivo Obtido nas Negociações
- E07: Taxa de Conversão Efetiva de Acordos
- E08: Curva Multicenário de Sensibilidade (30% a 90% de aceite)
- E09: Economia Líquida Projetada por UF
- E10: Economia e Eficiência por Escritório Credenciado
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


def calculate_effectiveness_metrics(
    df: pd.DataFrame,
    target_discount_rate: float = 0.50,
    author_acceptance_rate: float = 0.65,
    lawyer_adherence_rate: float = 0.90,
    court_costs_and_fees_pct: float = 0.15,
) -> Dict[str, Any]:
    """Calcula a suíte completa de métricas de efetividade financeira e ROI da política.
    
    Args:
        df: DataFrame com histórico e recomendações
        target_discount_rate: Deságio médio aplicado no acordo (default: 50%)
        author_acceptance_rate: Taxa esperada de aceite da parte autora (default: 65%)
        lawyer_adherence_rate: Taxa de adesão dos advogados à política (default: 90%)
        court_costs_and_fees_pct: Percentual adicional de honorários sucumbenciais e custas evitadas (default: 15%)
        
    Returns:
        Dicionário com métricas E01 a E10.
    """
    total_cases = len(df)
    if total_cases == 0:
        return {
            "total_cases": 0,
            "E01_gross_cost_avoidance": 0.0,
            "E02_net_cost_avoidance": 0.0,
            "E03_savings_margin_percentage": 0.0,
            "E04_roi_multiple": 0.0,
            "E05_avg_settlement_ticket": 0.0,
            "E05_avg_condemnation_ticket": 0.0,
            "E06_effective_discount_rate": 0.0,
            "E07_settlement_conversion_rate": 0.0,
            "E08_sensitivity_curve": [],
            "E09_savings_by_uf": {},
            "E10_savings_by_law_firm": {},
        }

    # Baseline histórico
    condemnations_mask = df["Resultado micro"].isin(["Procedência", "Parcial procedência"]) if "Resultado micro" in df.columns else pd.Series(True, index=df.index)
    total_historical_losses = float(df["Valor da condenação/indenização"].sum()) if "Valor da condenação/indenização" in df.columns else float(df["Valor da causa"].sum() * 0.40)
    condemnation_count = int(condemnations_mask.sum())
    avg_condemnation_ticket = total_historical_losses / condemnation_count if condemnation_count > 0 else 10658.35
    
    # Custo unitário real da condenação incluindo honorários sucumbenciais e custas
    loss_with_fees = avg_condemnation_ticket * (1.0 + court_costs_and_fees_pct)

    # Identificação dos casos elegíveis para acordo pela política
    if "policy_recommendation" in df.columns:
        settlement_eligible_mask = df["policy_recommendation"].str.contains("ACORDO", na=False)
    else:
        # Fallback por subsídios críticos
        missing_docs = (df.get("Contrato", 1) == 0) & (df.get("Extrato", 1) == 0)
        settlement_eligible_mask = missing_docs

    eligible_count = int(settlement_eligible_mask.sum())

    # Estimativa de acordos fechados
    effective_agreements_count = int(eligible_count * lawyer_adherence_rate * author_acceptance_rate)

    # Ticket médio negociado com deságio
    avg_settlement_ticket = avg_condemnation_ticket * (1.0 - target_discount_rate)
    total_settlement_disbursement = effective_agreements_count * avg_settlement_ticket

    # Condenações que foram efetivamente evitadas (Cost Avoidance Bruto - E01)
    # Cálculo dinâmico da taxa de derrota do grupo elegível (com fallback calibrado em 88%)
    if "Resultado micro" in df.columns and eligible_count > 0:
        condemned_in_eligible = df.loc[
            settlement_eligible_mask & df["Resultado micro"].isin(["Procedência", "Parcial procedência"])
        ]
        condemnation_rate_eligible = len(condemned_in_eligible) / eligible_count if eligible_count > 0 else 0.88
    else:
        condemnation_rate_eligible = 0.88

    condemnations_avoided_count = int(effective_agreements_count * condemnation_rate_eligible)
    gross_cost_avoidance = condemnations_avoided_count * loss_with_fees

    # Economia Líquida (E02)
    net_cost_avoidance = gross_cost_avoidance - total_settlement_disbursement

    # Margem de Economia (E03)
    savings_margin = (net_cost_avoidance / total_historical_losses * 100.0) if total_historical_losses > 0 else 0.0

    # Multiplicador de ROI (E04)
    roi_multiple = round(gross_cost_avoidance / total_settlement_disbursement, 2) if total_settlement_disbursement > 0 else 1.0

    # E08: Curva Multicenário de Sensibilidade (30% a 90% em passos de 10%)
    sensitivity_curve = []
    for acc in [0.30, 0.40, 0.50, 0.60, 0.65, 0.70, 0.80, 0.90]:
        n_agreed = int(eligible_count * lawyer_adherence_rate * acc)
        disburse = n_agreed * avg_settlement_ticket
        avoided = int(n_agreed * condemnation_rate_eligible) * loss_with_fees
        net_sav = avoided - disburse
        sensitivity_curve.append({
            "acceptance_rate_pct": int(acc * 100),
            "acceptance_rate": acc,
            "projected_cost_avoidance_brl": round(net_sav, 2),
            "agreements_count": n_agreed,
            "savings_margin_pct": round((net_sav / total_historical_losses * 100.0), 2) if total_historical_losses > 0 else 0.0,
            "roi_multiple": round(avoided / disburse, 2) if disburse > 0 else 1.0,
        })

    # E09: Economia por UF
    savings_by_uf = {}
    if "UF" in df.columns:
        for uf, uf_df in df.groupby("UF"):
            u_eligible = int((uf_df["policy_recommendation"].str.contains("ACORDO", na=False)).sum()) if "policy_recommendation" in uf_df.columns else len(uf_df)
            u_agreed = int(u_eligible * lawyer_adherence_rate * author_acceptance_rate)
            u_gross = int(u_agreed * condemnation_rate_eligible) * avg_condemnation_ticket
            u_disburse = u_agreed * avg_settlement_ticket
            savings_by_uf[str(uf)] = {
                "eligible_cases": u_eligible,
                "projected_agreements": u_agreed,
                "net_cost_avoidance": round(u_gross - u_disburse, 2),
            }

    # E10: Economia por Escritório Credenciado
    savings_by_firm = {}
    if "partner_law_firm" in df.columns:
        for firm, f_df in df.groupby("partner_law_firm"):
            f_eligible = int((f_df["policy_recommendation"].str.contains("ACORDO", na=False)).sum()) if "policy_recommendation" in f_df.columns else len(f_df)
            f_agreed = int(f_eligible * lawyer_adherence_rate * author_acceptance_rate)
            f_gross = int(f_agreed * condemnation_rate_eligible) * avg_condemnation_ticket
            f_disburse = f_agreed * avg_settlement_ticket
            savings_by_firm[str(firm)] = {
                "eligible_cases": f_eligible,
                "projected_agreements": f_agreed,
                "net_cost_avoidance": round(f_gross - f_disburse, 2),
            }

    return {
        "E01_gross_cost_avoidance": round(gross_cost_avoidance, 2),
        "E02_net_cost_avoidance": round(net_cost_avoidance, 2),
        "E03_savings_margin_percentage": round(savings_margin, 2),
        "E04_roi_multiple": roi_multiple,
        "E05_avg_settlement_ticket": round(avg_settlement_ticket, 2),
        "E05_avg_condemnation_ticket": round(avg_condemnation_ticket, 2),
        "E06_effective_discount_rate": round(target_discount_rate * 100.0, 1),
        "E07_settlement_conversion_rate": round(author_acceptance_rate * 100.0, 1),
        "E08_sensitivity_curve": sensitivity_curve,
        "E09_savings_by_uf": savings_by_uf,
        "E10_savings_by_law_firm": savings_by_firm,
        "total_cases_analyzed": total_cases,
        "eligible_for_settlement_count": eligible_count,
        "effective_agreements_count": effective_agreements_count,
    }
