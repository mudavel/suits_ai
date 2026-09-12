"""Script para processar e gerar o dataset enriquecido e as métricas de governança em formato CSV (Fase 1)."""

import os
import sys
import pandas as pd

# Adiciona diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.monitor.generator import load_and_merge_raw_dataset, enrich_dataset_with_governance, generate_governance_summary_json

def main():
    raw_csv_path = "data/dataset_raw_60k.csv"
    excel_path = "artefacts/Hackaton Unicamp/Hackaton_Enter_Base_Candidatos.xlsx"
    out_json = "data/governance_metrics.json"
    out_sample_csv = "data/cases_sample_120.csv"
    out_full_enriched_csv = "data/cases_enriched_60k.csv"
    
    # Se já existir o CSV bruto de 60k, lê direto em CSV (super rápido); senão carrega do Excel e exporta o CSV
    if os.path.exists(raw_csv_path):
        print(f"1. Carregando dados do CSV bruto: {raw_csv_path}...")
        df_merged = load_and_merge_raw_dataset(raw_csv_path)
    else:
        print(f"1. Carregando e convertendo dados originais do Excel: {excel_path}...")
        df_merged = load_and_merge_raw_dataset(excel_path)
        os.makedirs("data", exist_ok=True)
        df_merged.to_csv(raw_csv_path, index=False, encoding="utf-8")
        print(f"   -> Salvo dataset bruto em CSV: {raw_csv_path}")
        
    print(f"   -> {len(df_merged)} linhas carregadas.")
    
    print("2. Enriquecendo com metadados de escritórios, advogados e governança...")
    df_enriched = enrich_dataset_with_governance(df_merged)
    
    print(f"3. Gerando métricas consolidadas e tabelas CSV em 'data/'...")
    summary = generate_governance_summary_json(df_enriched, out_json)
    print(f"   -> Cost Avoidance Total: R$ {summary['overview']['total_cost_avoidance']:,.2f}")
    print(f"   -> Taxa Global de Aderência: {summary['overview']['global_adherence_rate']}%")
    print(f"   -> ROI Múltiplo: {summary['overview']['roi_multiple']}x")
    
    print(f"4. Salvando amostra de 120 casos em CSV: {out_sample_csv}...")
    df_sample = df_enriched.sample(n=120, random_state=42)
    df_sample.to_csv(out_sample_csv, index=False, encoding="utf-8")
    
    # Exporta também a base completa enriquecida em CSV
    df_enriched.to_csv(out_full_enriched_csv, index=False, encoding="utf-8")
    print(f"   -> Base completa enriquecida salva em: {out_full_enriched_csv}")
    
    print("✅ Pipeline da Fase 1 em CSV concluída com sucesso!")

if __name__ == "__main__":
    main()
