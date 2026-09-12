"""
Script 01: Ingestão, Auditoria e Preparação da Base de 60.000 Sentenças (Banco Unicamp).
Frente exclusiva da Pessoa 1 (Data Science & Jurimetrics Lead).

Executa:
1. Leitura das abas 'Resultados dos processos' e 'Subsídios disponibilizados'.
2. Normalização e cruzamento por Número do Processo.
3. Extração e cálculo do Baseline Histórico de Custos e Condenações.
4. Exportação em formatos de alta performance (CSV e Parquet) para consumo do time.
5. Exportação das estatísticas oficiais em 'artefatos/baseline_stats.json'.
"""

import os
import sys
import json
import unicodedata
import pandas as pd
import numpy as np
from pathlib import Path

# Garante compatibilidade UTF-8 em terminais Windows (evita erro cp1252)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def normalize_col(name: str) -> str:
    """Normaliza nomes de colunas removendo acentos, pontuações e convertendo para snake_case."""
    n = unicodedata.normalize('NFKD', str(name)).encode('ASCII', 'ignore').decode('utf-8')
    n = n.strip().lower()
    for char in ['/', '-', '.', ':', ' ']:
        n = n.replace(char, '_')
    while '__' in n:
        n = n.replace('__', '_')
    return n.strip('_')


def main():
    root_dir = Path(__file__).resolve().parent.parent
    raw_excel_path = root_dir / "artefacts" / "Hackaton Unicamp" / "Hackaton_Enter_Base_Candidatos.xlsx"
    
    if not raw_excel_path.exists():
        raise FileNotFoundError(f"Arquivo Excel não encontrado em: {raw_excel_path}")
        
    print(f"📖 Carregando planilha oficial de: {raw_excel_path}...")
    
    # 1. Leitura da aba de Resultados
    print("   -> Lendo aba 'Resultados dos processos'...")
    df_res = pd.read_excel(raw_excel_path, sheet_name="Resultados dos processos")
    
    # 2. Leitura da aba de Subsídios (header na 2ª linha, index 1)
    print("   -> Lendo aba 'Subsídios disponibilizados'...")
    df_sub = pd.read_excel(raw_excel_path, sheet_name="Subsídios disponibilizados", header=1)
    
    # Normalização de nomes de colunas
    df_res.columns = [normalize_col(c) for c in df_res.columns]
    df_sub.columns = [normalize_col(c) for c in df_sub.columns]
    
    # Ajuste do identificador do processo
    col_proc_res = [c for c in df_res.columns if 'processo' in c][0]
    col_proc_sub = [c for c in df_sub.columns if 'processo' in c][0]
    
    df_res.rename(columns={col_proc_res: "numero_processo"}, inplace=True)
    df_sub.rename(columns={col_proc_sub: "numero_processo"}, inplace=True)
    
    # Limpeza de strings
    df_res["numero_processo"] = df_res["numero_processo"].astype(str).str.strip()
    df_sub["numero_processo"] = df_sub["numero_processo"].astype(str).str.strip()
    
    # 3. Merge dos dois datasets
    print("🔄 Cruzando bases pelo número do processo...")
    df = pd.merge(df_res, df_sub, on="numero_processo", how="inner")
    print(f"   -> Total de processos consolidados: {len(df):,}")
    
    # Padronização de colunas de valor
    col_causa = [c for c in df.columns if 'causa' in c][0]
    col_cond = [c for c in df.columns if 'condenac' in c or 'indenizac' in c][0]
    df.rename(columns={col_causa: "valor_causa", col_cond: "valor_condenacao"}, inplace=True)
    
    df["valor_causa"] = pd.to_numeric(df["valor_causa"], errors="coerce").fillna(0.0)
    df["valor_condenacao"] = pd.to_numeric(df["valor_condenacao"], errors="coerce").fillna(0.0)
    
    # Mapeamento binário do desfecho: 1 se o banco perdeu (Não êxito / Condenação), 0 se venceu (Êxito)
    df["perdeu"] = df["resultado_macro"].astype(str).str.contains("não", case=False, na=False).astype(int)
    
    # Contagem de subsídios críticos (Contrato + Extrato + Comprovante de Crédito)
    criticos = ["contrato", "extrato", "comprovante_de_credito"]
    for c in criticos:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)
            
    df["qtd_criticos"] = df[criticos].sum(axis=1)
    
    # 4. Cálculo do Baseline Histórico
    total_processos = len(df)
    total_perdas = int(df["perdeu"].sum())
    taxa_perda = float(df["perdeu"].mean())
    total_gasto_condenacao = float(df["valor_condenacao"].sum())
    ticket_medio_condenacao = float(df[df["perdeu"] == 1]["valor_condenacao"].mean())
    ticket_medio_causa = float(df["valor_causa"].mean())
    
    # Taxas de perda por quantidade de subsídios críticos
    perda_por_criticos = df.groupby("qtd_criticos")["perdeu"].agg(
        volume="count",
        perdas="sum",
        taxa="mean"
    ).to_dict(orient="index")
    
    # Perda por UF (Top 10 estados com maior volume)
    perda_por_uf = df.groupby("uf")["perdeu"].agg(
        volume="count",
        taxa="mean",
        custo_total=lambda s: df.loc[s.index, "valor_condenacao"].sum()
    ).sort_values(by="volume", ascending=False).to_dict(orient="index")
    
    baseline_stats = {
        "total_processos": total_processos,
        "total_perdas": total_perdas,
        "taxa_perda_global": round(taxa_perda, 4),
        "taxa_vitoria_global": round(1.0 - taxa_perda, 4),
        "gasto_total_condenacoes_brl": round(total_gasto_condenacao, 2),
        "ticket_medio_condenacao_brl": round(ticket_medio_condenacao, 2),
        "ticket_medio_causa_brl": round(ticket_medio_causa, 2),
        "perda_por_criticos": {int(k): {m: round(v, 4) if isinstance(v, float) else v for m, v in vals.items()} for k, vals in perda_por_criticos.items()},
        "top_ufs": {k: {m: round(v, 4) if isinstance(v, float) else v for m, v in vals.items()} for k, vals in list(perda_por_uf.items())[:10]}
    }
    
    print("\n" + "="*70)
    print("📊 BASELINE HISTÓRICO OFICIAL DO BANCO UNICAMP (60.000 PROCESSOS)")
    print("="*70)
    print(f"Total de processos analisados: {total_processos:,}")
    print(f"Total de derrotas (Não êxito): {total_perdas:,} ({taxa_perda*100:.2f}%)")
    print(f"Gasto histórico acumulado:     R$ {total_gasto_condenacao:,.2f}")
    print(f"Média por condenação sofrida:  R$ {ticket_medio_condenacao:,.2f}")
    print(f"Valor médio da causa:          R$ {ticket_medio_causa:,.2f}")
    print("\nTaxa de Perda por Documentos Críticos (Contrato, Extrato, BACEN):")
    for q, metrics in baseline_stats["perda_por_criticos"].items():
        print(f"   - {q} críticos presentes: {metrics['volume']:,} casos | Taxa de Perda: {metrics['taxa']*100:.1f}%")
    print("="*70)
    
    # 5. Exportação dos Dados e Metadados
    data_dir = root_dir / "data"
    artefacts_dir = root_dir / "artefacts" / "suits_docs"
    data_dir.mkdir(parents=True, exist_ok=True)
    artefacts_dir.mkdir(parents=True, exist_ok=True)
    
    csv_path = data_dir / "sentencas.csv"
    parquet_path = data_dir / "sentencas_processadas.parquet"
    stats_path = artefacts_dir / "baseline_stats.json"
    
    print(f"\n💾 Salvando dataset limpo em CSV: {csv_path}...")
    df.to_csv(csv_path, index=False, encoding="utf-8")
    
    print(f"💾 Salvando dataset em formato rápido Parquet: {parquet_path}...")
    df.to_parquet(parquet_path, index=False)
    
    print(f"💾 Salvando estatísticas de baseline em JSON: {stats_path}...")
    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(baseline_stats, f, indent=2, ensure_ascii=False)
        
    print("\n✅ Etapa 2 concluída com sucesso! Base preparada e auditada.")


if __name__ == "__main__":
    main()
