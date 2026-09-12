"""
Motor de Decisão Híbrido: Regras Probatórias Jurídicas + Random Forest Calibrado.
Frente exclusiva da Pessoa 1 (Data Science & Jurimetrics Lead).

Implementa a matriz estratégica de decisão:
1. Regra 1: Dossiê NÃO CONFORME (Fraude pericial confirmada) -> ACORDO FAST-TRACK (Súmula 479/STJ).
2. Regra 2: Cadeia Probatória Completa (Contrato + TED + BACEN) -> DEFESA ROBUSTA (Êxito > 95%).
3. Regra 3: Falha Probatória Severa (0 ou 1 crítico localizado) -> ACORDO (Inversão Ônus CDC art. 6º, VIII).
4. Regra 4: Zona Cinzenta (2 críticos) -> Classificação Jurimétrica via RANDOM FOREST CALIBRADO.
"""

import os
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Union, Optional

from .schemas import (
    PolicyResult,
    SettlementPricing,
    CaseData,
    SubsidiesInput,
    RecommendationType,
    ReasoningCode,
    RiskLevel,
)
from .pricing import calculate_pricing

# Carregamento do modelo serializado com cache em memória
_MODEL_CACHE = None


def get_model():
    """Carrega o pipeline do Random Forest calibrado a partir de artefatos/."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
        
    root_dir = Path(__file__).resolve().parent.parent.parent
    model_path = root_dir / "artefatos" / "modelo_jurimetrico.pkl"
    
    if model_path.exists():
        try:
            _MODEL_CACHE = joblib.load(model_path)
            return _MODEL_CACHE
        except Exception as e:
            print(f"⚠️ Aviso: Não foi possível carregar o modelo de {model_path}: {e}")
            return None
    return None


def _normalize_case_input(case_input: Union[dict, CaseData]) -> CaseData:
    """Valida e converte dicionários heterogêneos no schema Pydantic CaseData."""
    if isinstance(case_input, CaseData):
        return case_input
        
    if not isinstance(case_input, dict):
        raise ValueError(f"Entrada inválida. Esperado dict ou CaseData, recebido {type(case_input)}")
        
    # Extrai subsídios caso venham achatados ou aninhados
    raw_subsidios = case_input.get("subsidios", {})
    if not isinstance(raw_subsidios, dict):
        raw_subsidios = {}
        
    # Permite passar campos de subsídios diretamente na raiz do dicionário
    contrato = case_input.get("contrato", raw_subsidios.get("contrato", False))
    extrato = case_input.get("extrato", raw_subsidios.get("extrato", False))
    comp_cred = case_input.get(
        "comprovante_credito",
        case_input.get("comprovante_de_credito", raw_subsidios.get("comprovante_credito", raw_subsidios.get("comprovante_de_credito", False)))
    )
    dossie = case_input.get("dossie", raw_subsidios.get("dossie", None))
    dem_div = case_input.get(
        "demonstrativo_divida",
        case_input.get("demonstrativo_de_evolucao_da_divida", raw_subsidios.get("demonstrativo_divida", raw_subsidios.get("demonstrativo_de_evolucao_da_divida", False)))
    )
    laudo = case_input.get("laudo_referenciado", raw_subsidios.get("laudo_referenciado", False))
    
    subsidies_obj = SubsidiesInput(
        contrato=bool(contrato),
        extrato=bool(extrato),
        comprovante_credito=bool(comp_cred),
        dossie=dossie,
        demonstrativo_divida=bool(dem_div),
        laudo_referenciado=bool(laudo)
    )
    
    return CaseData(
        numero_processo=str(case_input.get("numero_processo", case_input.get("id", "PROC-0000"))),
        uf=str(case_input.get("uf", "SP")).strip().upper(),
        valor_causa=float(case_input.get("valor_causa", 10000.0)),
        assunto=case_input.get("assunto", "Empréstimo consignado"),
        sub_assunto=case_input.get("sub_assunto", "Não reconhecimento de contratação"),
        subsidios=subsidies_obj,
        metadata=case_input.get("metadata", {})
    )


def evaluate_case(case_data: Union[dict, CaseData]) -> PolicyResult:
    """
    Função pura oficial de avaliação estratégica de processos judiciais.
    Recebe os dados do processo e subsídios e devolve a recomendação auditável.
    
    Args:
        case_data: Dicionário ou instância de CaseData.
        
    Returns:
        PolicyResult com recomendação (DEFESA/ACORDO), confiança, risco, pricing e regras aplicadas.
    """
    case = _normalize_case_input(case_data)
    sub = case.subsidios
    
    applied_rules = []
    
    # -------------------------------------------------------------
    # REGRA 1: Dossiê Pericial NÃO CONFORME (Fraude Confirmada)
    # -------------------------------------------------------------
    dossie_status = str(sub.dossie).upper() if sub.dossie else "AUSENTE"
    if dossie_status == "NAO_CONFORME":
        applied_rules.append("🚨 Auditoria Probatória: Dossiê Grafotécnico/Facial atesta divergência de assinatura/biometria (Fraude Confirmada).")
        applied_rules.append("⚖️ Aplicação da Súmula 479/STJ (Responsabilidade objetiva por fortuito interno).")
        applied_rules.append("🛑 Recomendação de Acordo Fast-Track para mitigar perícia judicial onerosa, condenação de danos morais majorados e multa por má-fé.")
        
        prob_derrota = 0.98
        pricing = calculate_pricing(
            valor_causa=case.valor_causa,
            prob_derrota=prob_derrota,
            uf=case.uf
        )
        return PolicyResult(
            recommendation=RecommendationType.ACORDO.value,
            reasoning_code=ReasoningCode.DOSSIE_NAO_CONFORME.value,
            confidence_score=0.98,
            risk_level=RiskLevel.CRITICO.value,
            settlement_pricing=pricing,
            applied_rules=applied_rules
        )
        
    # Contagem de subsídios críticos disponíveis
    num_criticos = sum([int(sub.contrato), int(sub.extrato), int(sub.comprovante_credito)])
    
    # -------------------------------------------------------------
    # REGRA 2: Cadeia Probatória Completa (3 Críticos Presentes)
    # -------------------------------------------------------------
    if num_criticos == 3:
        applied_rules.append("🛡️ Força Probatória Plena: Contrato Assinado (CCB) + Comprovante de TED + Registro BACEN localizados.")
        if sub.demonstrativo_divida:
            applied_rules.append("📈 Histórico de amortização/descontos regulares demonstra conhecimento e usufruto prévio da operação.")
        applied_rules.append("⚖️ Art. 373, II, CPC atendido integralmente: Fato impeditivo/modificativo do direito do autor comprovado.")
        applied_rules.append("📊 Taxa histórica de êxito no tribunal superior a 95.9% para este perfil probatório.")
        
        return PolicyResult(
            recommendation=RecommendationType.DEFESA.value,
            reasoning_code=ReasoningCode.CADEIA_COMPLETA.value,
            confidence_score=0.95,
            risk_level=RiskLevel.BAIXO.value,
            settlement_pricing=None,
            applied_rules=applied_rules
        )
        
    # -------------------------------------------------------------
    # REGRA 3: Falha Probatória Severa (0 a 1 Crítico Presente)
    # -------------------------------------------------------------
    if num_criticos <= 1:
        applied_rules.append(f"⚠️ Falha Probatória Severa: Apenas {num_criticos} de 3 documentos essenciais localizados nos sistemas do banco.")
        if not sub.contrato:
            applied_rules.append("❌ Ausência de Cédula de Crédito Bancário (CCB) assinada ou com biometria válida.")
        if not sub.extrato:
            applied_rules.append("❌ Ausência de comprovante de TED/depósito na conta de titularidade do consumidor.")
        applied_rules.append("⚖️ Aplicação do art. 6º, VIII do CDC: Inversão do ônus da prova tornará a condenação quase certa.")
        applied_rules.append("📊 Probabilidade histórica de derrota superior a 81% (podendo atingir 98.6% sem contrato e extrato).")
        
        prob_derrota = 0.98 if num_criticos == 0 else 0.82
        pricing = calculate_pricing(
            valor_causa=case.valor_causa,
            prob_derrota=prob_derrota,
            uf=case.uf
        )
        
        return PolicyResult(
            recommendation=RecommendationType.ACORDO.value,
            reasoning_code=ReasoningCode.FALHA_PROBATORIA.value,
            confidence_score=0.90 if num_criticos == 1 else 0.97,
            risk_level=RiskLevel.ALTO.value if num_criticos == 1 else RiskLevel.CRITICO.value,
            settlement_pricing=pricing,
            applied_rules=applied_rules
        )
        
    # -------------------------------------------------------------
    # REGRA 4: Zona Cinzenta (2 Críticos Presentes) -> Random Forest
    # -------------------------------------------------------------
    applied_rules.append("🧠 Zona Cinzenta Probatória: 2 de 3 documentos críticos localizados. Ativação do Modelo Jurimétrico Random Forest Calibrado.")
    
    # Montagem do vetor de features para inferência
    log_causa = float(np.log1p(max(0.0, case.valor_causa)))
    total_subsidios = sum([
        int(sub.contrato),
        int(sub.extrato),
        int(sub.comprovante_credito),
        1 if dossie_status == "CONFORME" else 0,
        int(sub.demonstrativo_divida),
        int(sub.laudo_referenciado)
    ])
    
    # Dossiê numérico para o modelo (1 se Conforme, 0 se Ausente)
    dossie_num = 1 if dossie_status == "CONFORME" else 0
    
    features_df = pd.DataFrame([{
        "contrato": int(sub.contrato),
        "extrato": int(sub.extrato),
        "comprovante_de_credito": int(sub.comprovante_credito),
        "dossie": dossie_num,
        "demonstrativo_de_evolucao_da_divida": int(sub.demonstrativo_divida),
        "laudo_referenciado": int(sub.laudo_referenciado),
        "valor_causa": case.valor_causa,
        "log_valor_causa": log_causa,
        "qtd_criticos": num_criticos,
        "qtd_total_subsidios": total_subsidios,
        "uf": case.uf,
    }])
    
    model = get_model()
    if model is not None:
        try:
            prob_derrota = float(model.predict_proba(features_df)[0, 1])
            applied_rules.append(f"🌲 Classificador Random Forest Calibrado estimou probabilidade de derrota em {prob_derrota*100:.1f}% para a comarca ({case.uf}).")
        except Exception as e:
            prob_derrota = 0.35 if sub.contrato and sub.extrato else 0.50
            applied_rules.append(f"⚠️ Fallback estatístico ativado ({e}): probabilidade estimada em {prob_derrota*100:.1f}%.")
    else:
        # Fallback heurístico calibrado na base histórica caso o .pkl não esteja acessível
        prob_derrota = 0.13 if (sub.contrato and sub.extrato) else 0.47
        applied_rules.append(f"ℹ️ Estimador jurimétrico de contingência: probabilidade estimada em {prob_derrota*100:.1f}%.")
        
    # Limiar de corte de decisão estratégica na zona cinzenta
    # Se a probabilidade de condenação for >= 40%, o banco prefere estancar o custo via acordo
    THRESHOLD_ACORDO = 0.40
    
    if prob_derrota >= THRESHOLD_ACORDO:
        applied_rules.append(f"🤝 Risco de condenação ({prob_derrota*100:.1f}%) supera a tolerância de contencioso ({THRESHOLD_ACORDO*100:.0f}%). Proposta de acordo recomendada.")
        pricing = calculate_pricing(
            valor_causa=case.valor_causa,
            prob_derrota=prob_derrota,
            uf=case.uf
        )
        return PolicyResult(
            recommendation=RecommendationType.ACORDO.value,
            reasoning_code=ReasoningCode.ML_ZONA_CINZENTA.value,
            confidence_score=round(prob_derrota, 2),
            risk_level=RiskLevel.MEDIO.value if prob_derrota < 0.70 else RiskLevel.ALTO.value,
            settlement_pricing=pricing,
            applied_rules=applied_rules
        )
    else:
        confianca_vitoria = 1.0 - prob_derrota
        applied_rules.append(f"🛡️ Risco de condenação sob controle ({prob_derrota*100:.1f}%). Probabilidade de êxito de {confianca_vitoria*100:.1f}% justifica defesa técnica.")
        return PolicyResult(
            recommendation=RecommendationType.DEFESA.value,
            reasoning_code=ReasoningCode.ML_ZONA_CINZENTA.value,
            confidence_score=round(confianca_vitoria, 2),
            risk_level=RiskLevel.BAIXO.value if prob_derrota < 0.20 else RiskLevel.MEDIO.value,
            settlement_pricing=None,
            applied_rules=applied_rules
        )
