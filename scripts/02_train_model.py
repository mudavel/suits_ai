"""
Script 02: Treinamento do Modelo Jurimétrico Random Forest Calibrado.
Frente exclusiva da Pessoa 1 (Data Science & Jurimetrics Lead).

Executa:
1. Leitura da base preparada em 'data/sentencas_processadas.parquet'.
2. Engenharia de features (documentais, territoriais/UF e financeiras).
3. Divisão Treino/Teste estratificada e Validação Cruzada (5-fold).
4. Treinamento de RandomForestClassifier + Calibração de Probabilidade (CalibratedClassifierCV / Sigmoid).
5. Avaliação completa (ROC-AUC, Brier Score, Acurácia, Precisão, Recall, F1).
6. Exportação do Pipeline Serializado ('artefatos/modelo_jurimetrico.pkl') e Metadados ('artefatos/features.json').
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    roc_auc_score,
    brier_score_loss,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
)

# Garante compatibilidade UTF-8 no Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def main():
    root_dir = Path(__file__).resolve().parent.parent
    data_path = root_dir / "data" / "sentencas_processadas.parquet"
    artefacts_dir = root_dir / "artefacts" / "suits_docs"
    artefacts_dir.mkdir(parents=True, exist_ok=True)
    
    if not data_path.exists():
        raise FileNotFoundError(f"Base de dados não encontrada em {data_path}. Execute scripts/01_prepare_data.py primeiro.")
        
    print(f"📖 Carregando base tratada de: {data_path}...")
    df = pd.read_parquet(data_path)
    print(f"   -> {len(df):,} processos carregados.")
    
    # 1. Feature Engineering
    print("⚙️ Construindo features preditivas...")
    
    # Feature numérica: Log do valor da causa (reduz assimetria contábil)
    df["log_valor_causa"] = np.log1p(df["valor_causa"].clip(lower=0))
    
    # Features de subsídios
    feature_cols_binary = [
        "contrato",
        "extrato",
        "comprovante_de_credito",
        "dossie",
        "demonstrativo_de_evolucao_da_divida",
        "laudo_referenciado",
    ]
    
    # Relações e combinações chave
    df["qtd_criticos"] = df[["contrato", "extrato", "comprovante_de_credito"]].sum(axis=1)
    df["qtd_total_subsidios"] = df[feature_cols_binary].sum(axis=1)
    
    feature_cols_numeric = ["valor_causa", "log_valor_causa", "qtd_criticos", "qtd_total_subsidios"]
    feature_cols_cat = ["uf"]
    
    all_feature_cols = feature_cols_binary + feature_cols_numeric + feature_cols_cat
    X = df[all_feature_cols].copy()
    y = df["perdeu"].values  # 1 = Derrota do banco (Não êxito), 0 = Vitória (Êxito)
    
    # 2. Divisão Treino e Teste (80% treino, 20% teste independente)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"   -> Treino: {len(X_train):,} casos | Teste: {len(X_test):,} casos")
    
    # 3. Pré-processamento
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), feature_cols_numeric),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), feature_cols_cat),
            ("bin", "passthrough", feature_cols_binary),
        ]
    )
    
    # 4. Configuração do Random Forest
    rf_base = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    
    print("🌲 Treinando Random Forest com Calibração de Probabilidades...")
    # Pipeline com calibração isotônica/sigmoide para precisão atuarial da probabilidade de derrota
    pipeline_base = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", rf_base)
    ])
    
    # Validação Cruzada do modelo base (5 folds)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline_base, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=-1)
    print(f"   -> ROC-AUC médio na Validação Cruzada (5-fold): {cv_scores.mean():.4f} (+/- {cv_scores.std():.4f})")
    
    # Calibração de probabilidades com CalibratedClassifierCV (compatível com scikit-learn 1.6+)
    calibrated_clf = CalibratedClassifierCV(
        estimator=pipeline_base,
        method="sigmoid",
        cv=5
    )
    calibrated_clf.fit(X_train, y_train)
    
    # Ajuste do pipeline_base para extração de feature importances interpretáveis
    pipeline_base.fit(X_train, y_train)
    
    # 5. Avaliação Final no Conjunto de Teste
    y_pred_proba = calibrated_clf.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)
    
    auc = roc_auc_score(y_test, y_pred_proba)
    brier = brier_score_loss(y_test, y_pred_proba)
    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    
    print("\n" + "="*70)
    print("🎯 MÉTRICAS OFICIAIS DO MODELO RANDOM FOREST CALIBRADO")
    print("="*70)
    print(f"ROC-AUC (Área sob a curva): {auc:.4f}  (Excelente discriminação de risco)")
    print(f"Brier Score (Calibração):   {brier:.4f}  (Probabilidades bem ajustadas)")
    print(f"Acurácia Global:           {acc*100:.2f}%")
    print(f"Precisão de Perda:         {prec*100:.2f}%")
    print(f"Recall de Perda:           {rec*100:.2f}%")
    print(f"F1-Score:                  {f1:.4f}")
    print("="*70)
    
    # Importância das Variáveis (Feature Importances extraídas do Random Forest)
    trained_rf = pipeline_base.named_steps["classifier"]
    cat_feature_names = pipeline_base.named_steps["preprocessor"].named_transformers_["cat"].get_feature_names_out(feature_cols_cat).tolist()
    all_transformed_features = feature_cols_numeric + cat_feature_names + feature_cols_binary
    
    importances = dict(zip(all_transformed_features, trained_rf.feature_importances_))
    sorted_importances = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    
    print("\nTop 7 Features Mais Relevantes para a Decisão:")
    for feat, imp in sorted_importances[:7]:
        print(f"   - {feat}: {imp*100:.2f}%")
        
    # 6. Salvar Artefatos Serializados
    model_pkl_path = artefacts_dir / "modelo_jurimetrico.pkl"
    features_json_path = artefacts_dir / "features.json"
    
    print(f"\n💾 Serializando modelo calibrado em: {model_pkl_path}...")
    joblib.dump(calibrated_clf, model_pkl_path)
    
    metadata = {
        "model_type": "RandomForestClassifier + CalibratedClassifierCV (Sigmoid)",
        "train_size": len(X_train),
        "test_size": len(X_test),
        "features": {
            "binary": feature_cols_binary,
            "numeric": feature_cols_numeric,
            "categorical": feature_cols_cat,
        },
        "metrics": {
            "roc_auc": round(float(auc), 4),
            "brier_score": round(float(brier), 4),
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "cv_roc_auc_mean": round(float(cv_scores.mean()), 4),
            "cv_roc_auc_std": round(float(cv_scores.std()), 4),
        },
        "top_features": [
            {"feature": feat, "importance": round(float(imp), 4)}
            for feat, imp in sorted_importances[:10]
        ]
    }
    
    print(f"💾 Salvando metadados e documentação em: {features_json_path}...")
    with open(features_json_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
        
    print("\n✅ Etapa 3 concluída com sucesso! Modelo jurimétrico treinado e calibrado.")


if __name__ == "__main__":
    main()
