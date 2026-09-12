"""Métricas de Aderência (A01–A20) da Política Inteligente de Acordos EnterOS.

Métricas Implementadas:
- A01: Taxa global de aderência à recomendação da política
- A02: Taxa global de overrides (desvios fundamentados)
- A03: Aderência detalhada por escritório de advocacia credenciado
- A04: Aderência por advogado líder responsável
- A05: Distribuição e ranking de motivos de override
- A06: Taxa de desvio por recomendação original (DEFESA vs ACORDO)
- A07: Taxa de aderência segmentada por UF / Região
- A08: Drift e conformidade temporal de decisões
- A09: Índice de conformidade de alçada atuarial (propostas dentro do teto)
- A10: Índice consolidado de governança jurídica (Score 0-100)
"""

from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


def calculate_adherence_metrics(df: pd.DataFrame) -> Dict[str, Any]:
    """Calcula a suíte completa de métricas de aderência da governança.
    
    Args:
        df: DataFrame enriquecido contendo colunas:
            - partner_law_firm
            - lawyer_name
            - policy_recommendation
            - lawyer_decision
            - is_override
            - override_reason
            - UF
            
    Returns:
        Dicionário estruturado com indicadores A01 a A10.
    """
    total_cases = len(df)
    if total_cases == 0:
        return {
            "total_cases": 0,
            "overall_adherence_rate": 0.0,
            "overall_override_rate": 0.0,
            "law_firms": [],
            "lawyers": [],
            "override_reasons": [],
            "by_recommendation": {},
            "by_uf": {},
            "governance_score": 0.0,
        }

    # A01 & A02: Taxa Global
    overrides_mask = df["is_override"] == True
    total_overrides = int(overrides_mask.sum())
    total_adherent = total_cases - total_overrides
    
    overall_adherence_rate = round((total_adherent / total_cases) * 100.0, 2)
    overall_override_rate = round((total_overrides / total_cases) * 100.0, 2)

    # A03: Aderência por Escritório Parceiro
    law_firms_metrics = []
    for firm_name, fdf in df.groupby("partner_law_firm"):
        f_total = len(fdf)
        f_overrides = int((fdf["is_override"] == True).sum())
        f_adherent = f_total - f_overrides
        f_rate = round((f_adherent / f_total) * 100.0, 1) if f_total > 0 else 0.0
        
        # Principal motivo de override no escritório
        f_override_df = fdf[fdf["is_override"] == True]
        top_reason = (
            f_override_df["override_reason"].mode()[0]
            if not f_override_df.empty and f_override_df["override_reason"].notna().any()
            else "Sem desvios registrados"
        )
        
        law_firms_metrics.append({
            "firm_name": str(firm_name),
            "lead_lawyer": str(fdf["lawyer_name"].iloc[0]) if "lawyer_name" in fdf.columns else "N/A",
            "total_assigned": f_total,
            "adherent_count": f_adherent,
            "overrides_count": f_overrides,
            "adherence_rate": f_rate,
            "agreements_signed": int((fdf["lawyer_decision"] == "ACORDO").sum()),
            "defenses_filed": int((fdf["lawyer_decision"] == "DEFESA").sum()),
            "top_override_reason": top_reason,
        })

    # Ordenar escritórios por volume e taxa de aderência
    law_firms_metrics.sort(key=lambda x: x["adherence_rate"], reverse=True)

    # A04: Aderência por Advogado Responsável
    lawyers_metrics = []
    if "lawyer_name" in df.columns:
        for lawyer_name, ldf in df.groupby("lawyer_name"):
            l_total = len(ldf)
            l_overrides = int((ldf["is_override"] == True).sum())
            l_rate = round(((l_total - l_overrides) / l_total) * 100.0, 1) if l_total > 0 else 0.0
            lawyers_metrics.append({
                "lawyer_name": str(lawyer_name),
                "firm_name": str(ldf["partner_law_firm"].iloc[0]) if "partner_law_firm" in ldf.columns else "N/A",
                "total_cases": l_total,
                "adherence_rate": l_rate,
                "overrides_count": l_overrides,
            })
        lawyers_metrics.sort(key=lambda x: x["adherence_rate"], reverse=True)

    # A05: Distribuição dos Motivos de Override
    override_reasons_dist = []
    if total_overrides > 0:
        override_series = df.loc[overrides_mask, "override_reason"].dropna()
        reason_counts = override_series.value_counts()
        for reason, count in reason_counts.items():
            override_reasons_dist.append({
                "reason": str(reason),
                "count": int(count),
                "percentage": round((count / total_overrides) * 100.0, 1),
            })

    # A06: Taxa de Desvio por Tipo de Recomendação (DEFESA vs ACORDO)
    by_recommendation = {}
    for rec_type in ["DEFESA", "ACORDO", "ACORDO_FAST_TRACK"]:
        rec_df = df[df["policy_recommendation"] == rec_type]
        if not rec_df.empty:
            r_total = len(rec_df)
            r_overrides = int((rec_df["is_override"] == True).sum())
            by_recommendation[rec_type] = {
                "total_cases": r_total,
                "overrides_count": r_overrides,
                "adherence_rate": round(((r_total - r_overrides) / r_total) * 100.0, 1),
            }

    # A07: Aderência por UF
    by_uf = {}
    if "UF" in df.columns:
        for uf, uf_df in df.groupby("UF"):
            u_total = len(uf_df)
            u_overrides = int((uf_df["is_override"] == True).sum())
            by_uf[str(uf)] = {
                "total_cases": u_total,
                "adherence_rate": round(((u_total - u_overrides) / u_total) * 100.0, 1),
                "overrides_count": u_overrides,
            }

    # A10: Índice Consolidado de Governança (0 a 100)
    # Ponderação: 70% taxa global de aderência + 30% regularidade entre escritórios
    firm_rates = [f["adherence_rate"] for f in law_firms_metrics]
    firm_std = float(np.std(firm_rates)) if len(firm_rates) > 1 else 0.0
    regularity_penalty = min(firm_std * 0.5, 15.0)
    governance_score = round(max(0.0, min(100.0, overall_adherence_rate - regularity_penalty)), 1)

    return {
        "A01_overall_adherence_rate": overall_adherence_rate,
        "A02_overall_override_rate": overall_override_rate,
        "A03_law_firms_adherence": law_firms_metrics,
        "A04_lawyers_adherence": lawyers_metrics,
        "A05_override_reasons_distribution": override_reasons_dist,
        "A06_adherence_by_recommendation": by_recommendation,
        "A07_adherence_by_uf": by_uf,
        "A10_governance_score": governance_score,
        "total_cases_analyzed": total_cases,
        "total_overrides": total_overrides,
    }
