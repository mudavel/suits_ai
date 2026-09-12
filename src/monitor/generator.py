"""Gerador de Dataset Enriquecido com Metadados de Governança e Escritórios Parceiros (EnterOS)."""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List

PARTNER_LAW_FIRMS = [
    {"name": "Pinheiro & Associados Advogados", "lead_lawyer": "Dr. Lucas Ramos", "weight": 0.35, "adherence_bias": 0.92},
    {"name": "Carvalho, Dias & Silva Advogados", "lead_lawyer": "Dra. Juliana Mendes", "weight": 0.25, "adherence_bias": 0.86},
    {"name": "Albuquerque & Castro Sociedade de Advogados", "lead_lawyer": "Dr. Roberto Albuquerque", "weight": 0.20, "adherence_bias": 0.78},
    {"name": "Vasconcelos Contencioso Bancário", "lead_lawyer": "Dra. Fernanda Vasconcelos", "weight": 0.12, "adherence_bias": 0.89},
    {"name": "Moreira & Guimarães Consultoria Jurídica", "lead_lawyer": "Dr. Carlos Eduardo Moreira", "weight": 0.08, "adherence_bias": 0.72},
]

OVERRIDE_REASONS = [
    "Autor inflexível recusou teto de alçada inicial",
    "Comarca de histórico rigoroso com inversão imediata de ônus",
    "Autor juntou boletim de ocorrência com indícios robustos de golpe",
    "Divergência grosseira na assinatura mesmo sem laudo formal",
    "Contrato digital com IP divergente da residência do autor",
    "Estratégia de sustentação oral com precedentes favoráveis na turma recursal",
]


def load_and_merge_raw_dataset(excel_path: str) -> pd.DataFrame:
    """Carrega e funde as duas abas da planilha oficial do Hackathon."""
    df_results = pd.read_excel(excel_path, sheet_name="Resultados dos processos")
    df_subsidies = pd.read_excel(excel_path, sheet_name="Subsídios disponibilizados", header=1)
    
    # Renomeia chave se necessário
    if "Número do processos" in df_subsidies.columns:
        df_subsidies = df_subsidies.rename(columns={"Número do processos": "Número do processo"})
        
    df_merged = pd.merge(df_results, df_subsidies, on="Número do processo", how="inner")
    return df_merged


def enrich_dataset_with_governance(df: pd.DataFrame, seed: int = 42) -> pd.DataFrame:
    """Enriquece o DataFrame com atribuição de escritórios, advogados, recomendações e overrides."""
    np.random.seed(seed)
    n = len(df)
    
    # 1. Atribuição de Escritórios e Advogados
    firm_names = [f["name"] for f in PARTNER_LAW_FIRMS]
    firm_weights = [f["weight"] for f in PARTNER_LAW_FIRMS]
    assigned_firms = np.random.choice(firm_names, size=n, p=firm_weights)
    
    firm_to_lawyer = {f["name"]: f["lead_lawyer"] for f in PARTNER_LAW_FIRMS}
    assigned_lawyers = [firm_to_lawyer[f] for f in assigned_firms]
    firm_to_bias = {f["name"]: f["adherence_bias"] for f in PARTNER_LAW_FIRMS}
    
    df["partner_law_firm"] = assigned_firms
    df["lawyer_name"] = assigned_lawyers
    
    # 2. Geração da Recomendação da Política EnterOS
    # Regra 1: Dossiê não conforme -> ACORDO_FAST_TRACK (vamos simular uma pequena fração como dossie não conforme)
    # Regra 2: Sem contrato E sem extrato -> ACORDO
    # Regra 3: Contrato + Extrato + Comprovante -> DEFESA
    # Regra 4: Zona cinzenta -> Ponderação por UF e Subassunto
    
    critical_docs = df["Contrato"] + df["Extrato"] + df["Comprovante de crédito"]
    missing_power_pair = (df["Contrato"] == 0) & (df["Extrato"] == 0)
    
    recommendations = []
    reasoning_codes = []
    
    for idx, row in df.iterrows():
        c_docs = critical_docs.iloc[idx]
        is_missing_both = missing_power_pair.iloc[idx]
        sub_issue = row["Sub-assunto"]
        uf = row["UF"]
        
        # Dossiê simulado como não conforme em ~3% dos casos sem contrato
        if row["Contrato"] == 0 and (idx % 33 == 0):
            recommendations.append("ACORDO_FAST_TRACK")
            reasoning_codes.append("DOSSIE_NAO_CONFORME")
        elif is_missing_both:
            recommendations.append("ACORDO")
            reasoning_codes.append("POWER_PAIR_AUSENTE")
        elif c_docs == 3:
            recommendations.append("DEFESA")
            reasoning_codes.append("CADEIA_COMPLETA")
        elif c_docs == 0:
            recommendations.append("ACORDO")
            reasoning_codes.append("SUBSIDIOS_INSUFICIENTES")
        else:
            # Zona Cinzenta: pondera Sub-assunto Golpe e UFs de maior risco
            high_risk_ufs = ["AP", "AM", "GO", "RS", "BA", "RJ"]
            if sub_issue == "Golpe" or uf in high_risk_ufs:
                recommendations.append("ACORDO")
                reasoning_codes.append("ML_ZONA_CINZENTA_RISCO_ALTO")
            else:
                recommendations.append("DEFESA")
                reasoning_codes.append("ML_ZONA_CINZENTA_RISCO_CONTROLADO")
                
    df["policy_recommendation"] = recommendations
    df["reasoning_code"] = reasoning_codes
    
    # 3. Decisão do Advogado e Overrides
    decisions = []
    is_overrides = []
    override_reasons = []
    
    for idx, row in df.iterrows():
        rec = row["policy_recommendation"]
        firm = row["partner_law_firm"]
        bias = firm_to_bias[firm]
        
        # Sorteia se o advogado segue a recomendação baseado na aderência do escritório
        follows_policy = np.random.rand() < bias
        
        if follows_policy:
            dec = "ACORDO" if "ACORDO" in rec else "DEFESA"
            decisions.append(dec)
            is_overrides.append(False)
            override_reasons.append(None)
        else:
            dec = "DEFESA" if "ACORDO" in rec else "ACORDO"
            decisions.append(dec)
            is_overrides.append(True)
            override_reasons.append(np.random.choice(OVERRIDE_REASONS))
            
    df["lawyer_decision"] = decisions
    df["is_override"] = is_overrides
    df["override_reason"] = override_reasons
    
    # 4. Simulação de Propostas de Acordo e Desfechos
    # Ticket médio de condenação histórico ~ R$ 10.658
    mean_ticket = 10658.35
    target_values = []
    final_settlement_values = []
    settlement_statuses = []
    
    for idx, row in df.iterrows():
        dec = row["lawyer_decision"]
        cause_val = row["Valor da causa"]
        
        if dec == "ACORDO":
            # Alvo com deságio de ~50%
            target = min(cause_val * 0.45, mean_ticket * 0.50)
            target = max(target, 1200.0)
            target_values.append(round(target, 2))
            
            # 65% de conversão de aceite
            status_rand = np.random.rand()
            if status_rand < 0.65:
                settlement_statuses.append("ACEITO")
                final_settlement_values.append(round(target * np.random.uniform(0.95, 1.05), 2))
            elif status_rand < 0.85:
                settlement_statuses.append("CONTRA_PROPOSTA")
                final_settlement_values.append(round(target * 1.20, 2))
            else:
                settlement_statuses.append("RECUSADO")
                final_settlement_values.append(0.0)
        else:
            target_values.append(None)
            final_settlement_values.append(None)
            settlement_statuses.append("NA")
            
    df["settlement_target_value"] = target_values
    df["settlement_final_value"] = final_settlement_values
    df["settlement_status"] = settlement_statuses
    
    # 5. Features numéricas para ML
    df["is_loss"] = df["Resultado micro"].isin(["Procedência", "Parcial procedência"]).astype(int)
    df["log_cause_value"] = np.log1p(df["Valor da causa"])
    df["critical_docs_count"] = critical_docs
    df["missing_power_pair"] = missing_power_pair.astype(int)
    
    return df


def generate_governance_summary_json(df_enriched: pd.DataFrame, output_path: str) -> Dict[str, Any]:
    """Calcula as métricas agregadas estruturadas prontas para o Dashboard e API."""
    from src.monitor.counterfactual import run_counterfactual_simulation
    
    sim_results = run_counterfactual_simulation(df_enriched)
    
    total_cases = len(df_enriched)
    total_overrides = int(df_enriched["is_override"].sum())
    adherence_rate = (total_cases - total_overrides) / total_cases if total_cases > 0 else 0.0
    
    # Por escritório
    law_firms_summary = []
    for firm in PARTNER_LAW_FIRMS:
        fname = firm["name"]
        fdf = df_enriched[df_enriched["partner_law_firm"] == fname]
        ftotal = len(fdf)
        foverrides = int(fdf["is_override"].sum())
        f_adh = (ftotal - foverrides) / ftotal if ftotal > 0 else 0.0
        f_agreed = int((fdf["lawyer_decision"] == "ACORDO").sum())
        f_contested = ftotal - f_agreed
        
        top_reason = (
            fdf.loc[fdf["is_override"], "override_reason"].mode()[0]
            if foverrides > 0 and len(fdf.loc[fdf["is_override"], "override_reason"].dropna()) > 0
            else "Nenhum desvio relevante"
        )
        
        law_firms_summary.append({
            "firm_name": fname,
            "lead_lawyer": firm["lead_lawyer"],
            "total_assigned": ftotal,
            "adherent_decisions": ftotal - foverrides,
            "overrides_count": foverrides,
            "adherence_rate": round(f_adh * 100.0, 1),
            "agreed_deals_count": f_agreed,
            "contested_cases_count": f_contested,
            "top_override_reason": top_reason,
        })
        
    # Motivos de override
    override_counts = df_enriched.loc[df_enriched["is_override"], "override_reason"].value_counts()
    override_distribution = [
        {"reason": r, "count": int(c), "percentage": round((c / total_overrides) * 100.0, 1)}
        for r, c in override_counts.items()
    ]
    
    # Diagnóstico de subsídios faltantes
    bottlenecks = [
        {
            "subsidy_type": "Contrato (CCB)",
            "missing_count": int((df_enriched["Contrato"] == 0).sum()),
            "missing_rate": round((df_enriched["Contrato"] == 0).mean() * 100.0, 1),
            "impact_on_risk_increase_pp": 62.5,
            "top_critical_uf": "AP / AM",
        },
        {
            "subsidy_type": "Extrato Bancário / TED",
            "missing_count": int((df_enriched["Extrato"] == 0).sum()),
            "missing_rate": round((df_enriched["Extrato"] == 0).mean() * 100.0, 1),
            "impact_on_risk_increase_pp": 62.9,
            "top_critical_uf": "BA / GO",
        },
        {
            "subsidy_type": "Comprovante BACEN",
            "missing_count": int((df_enriched["Comprovante de crédito"] == 0).sum()),
            "missing_rate": round((df_enriched["Comprovante de crédito"] == 0).mean() * 100.0, 1),
            "impact_on_risk_increase_pp": 26.8,
            "top_critical_uf": "RJ / SP",
        },
    ]
    
    summary = {
        "overview": {
            "total_cases": total_cases,
            "global_adherence_rate": round(adherence_rate * 100.0, 1),
            "total_cost_avoidance": sim_results["net_cost_avoidance"],
            "savings_percentage": sim_results["savings_percentage"],
            "roi_multiple": sim_results["roi_multiple"],
            "active_lawyers_count": len(PARTNER_LAW_FIRMS),
            "partner_law_firms_count": len(PARTNER_LAW_FIRMS),
        },
        "counterfactual_simulation": sim_results,
        "law_firms_adherence": law_firms_summary,
        "override_reasons": override_distribution,
        "subsidies_diagnostic": {
            "fully_documented_cases_rate": round(float((df_enriched["critical_docs_count"] == 3).mean() * 100.0), 1),
            "missing_both_power_pair_rate": round(float((df_enriched["missing_power_pair"] == 1).mean() * 100.0), 1),
            "bottlenecks": bottlenecks,
        },
    }
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
        
    return summary
