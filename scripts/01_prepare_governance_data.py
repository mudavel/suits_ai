"""Script para processar e gerar o dataset enriquecido e as métricas de governança (Fase 1)."""

import os
import sys

# Adiciona diretório raiz ao path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.monitor.generator import load_and_merge_raw_dataset, enrich_dataset_with_governance, generate_governance_summary_json

def main():
    excel_path = "artefacts/Hackaton Unicamp/Hackaton_Enter_Base_Candidatos.xlsx"
    out_json = "data/governance_metrics.json"
    out_sample_parquet = "data/cases_enriched_sample.parquet"
    out_sample_json = "data/cases_sample_120.json"
    
    print(f"1. Carregando dados de: {excel_path}...")
    df_merged = load_and_merge_raw_dataset(excel_path)
    print(f"   -> {len(df_merged)} linhas carregadas e mescladas.")
    
    print("2. Enriquecendo com metadados de escritórios, advogados e governança...")
    df_enriched = enrich_dataset_with_governance(df_merged)
    
    print(f"3. Gerando métricas consolidadas em: {out_json}...")
    summary = generate_governance_summary_json(df_enriched, out_json)
    print(f"   -> Cost Avoidance Total Calculado: R$ {summary['overview']['total_cost_avoidance']:,.2f}")
    print(f"   -> Taxa Global de Aderência: {summary['overview']['global_adherence_rate']}%")
    print(f"   -> ROI Múltiplo: {summary['overview']['roi_multiple']}x")
    
    print(f"4. Salvando amostra estratificada de 120 casos para a aplicação em: {out_sample_json}...")
    os.makedirs("data", exist_ok=True)
    df_sample = df_enriched.sample(n=120, random_state=42)
    df_sample.to_csv("data/cases_enriched_sample.csv", index=False)
    
    # Converte tipos para JSON serializável
    sample_records = df_sample.to_dict(orient="records")
    import json
    with open(out_sample_json, "w", encoding="utf-8") as f:
        json.dump(sample_records, f, indent=2, ensure_ascii=False, default=str)
        
    print("✅ Pipeline da Fase 1 da Governança concluída com sucesso!")

if __name__ == "__main__":
    main()
