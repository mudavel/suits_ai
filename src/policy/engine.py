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
from collections import Counter
from pathlib import Path
from typing import Dict, Any, Union, Optional, List, Tuple

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
_THRESHOLD_ACORDO = 0.40


def get_model():
    """Carrega o pipeline do Random Forest calibrado a partir de artefacts/."""
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
        
    root_dir = Path(__file__).resolve().parent.parent.parent
    model_path = root_dir / "artefacts" / "suits_docs" / "modelo_jurimetrico.pkl"
    if not model_path.exists():
        model_path = root_dir / "artefacts" / "modelo_jurimetrico.pkl"
    
    if model_path.exists():
        try:
            _MODEL_CACHE = joblib.load(model_path)
            _force_single_thread_inference(_MODEL_CACHE)
            return _MODEL_CACHE
        except Exception as e:
            print(f"Aviso: Não foi possível carregar o modelo de {model_path}: {e}")
            return None
    return None


def _force_single_thread_inference(model: Any) -> None:
    """
    Evita erro de permissão do joblib em ambientes restritos no Windows.
    O artefato foi treinado com paralelismo; na inferência local, forçamos 1 thread.
    """
    calibrated_classifiers = getattr(model, "calibrated_classifiers_", None)
    if not calibrated_classifiers:
        return

    for calibrated in calibrated_classifiers:
        estimator = getattr(calibrated, "estimator", None)
        classifier = getattr(estimator, "named_steps", {}).get("classifier") if estimator is not None else None
        if classifier is not None and hasattr(classifier, "n_jobs"):
            classifier.n_jobs = 1


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


def _format_percent(value: float) -> str:
    return f"{value * 100:.1f}%".replace(".", ",")


def _format_currency(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _format_count_boundary(direction: str, threshold: float) -> str:
    if direction == ">":
        return f"{int(np.floor(threshold) + 1)} ou mais"
    return f"até {int(np.floor(threshold))}"


def _build_features_df(case: CaseData, dossie_status: str, num_criticos: int) -> pd.DataFrame:
    log_causa = float(np.log1p(max(0.0, case.valor_causa)))
    total_subsidios = sum([
        int(case.subsidios.contrato),
        int(case.subsidios.extrato),
        int(case.subsidios.comprovante_credito),
        1 if dossie_status == "CONFORME" else 0,
        int(case.subsidios.demonstrativo_divida),
        int(case.subsidios.laudo_referenciado)
    ])
    dossie_num = 1 if dossie_status == "CONFORME" else 0

    return pd.DataFrame([{
        "contrato": int(case.subsidios.contrato),
        "extrato": int(case.subsidios.extrato),
        "comprovante_de_credito": int(case.subsidios.comprovante_credito),
        "dossie": dossie_num,
        "demonstrativo_de_evolucao_da_divida": int(case.subsidios.demonstrativo_divida),
        "laudo_referenciado": int(case.subsidios.laudo_referenciado),
        "valor_causa": case.valor_causa,
        "log_valor_causa": log_causa,
        "qtd_criticos": num_criticos,
        "qtd_total_subsidios": total_subsidios,
        "uf": case.uf,
    }])


def _describe_condition(feature_name: str, direction: str, threshold: float, actual_value: float) -> Optional[str]:
    if feature_name.startswith("uf_"):
        uf_feature = feature_name.split("_", 1)[1]
        if direction == ">" and actual_value > 0.5:
            return f"O processo tramita em {uf_feature}, e essa UF aparece em um ramo do modelo com comportamento semelhante ao deste caso."
        return None

    if feature_name == "contrato":
        return (
            "O modelo encontrou contrato ou biometria válida, o que favorece a defesa."
            if direction == ">" else
            "O modelo sentiu falta de contrato ou biometria válida, o que pesa contra a defesa."
        )
    if feature_name == "extrato":
        return (
            "O modelo encontrou extrato ou TED em nome do cliente, o que ajuda a sustentar a contratação."
            if direction == ">" else
            "O modelo não encontrou extrato ou TED suficientemente útil, o que enfraquece a defesa."
        )
    if feature_name == "comprovante_de_credito":
        return (
            "O comprovante de liberação do crédito apareceu como fator favorável à defesa."
            if direction == ">" else
            "A ausência de comprovante de liberação do crédito pesou contra a defesa."
        )
    if feature_name == "dossie":
        return (
            "O dossiê de autenticação apareceu como conforme, o que reforça a regularidade da contratação."
            if direction == ">" else
            "O dossiê não trouxe reforço suficiente de autenticidade neste caso."
        )
    if feature_name == "demonstrativo_de_evolucao_da_divida":
        return (
            "O histórico de evolução da dívida ajudou a mostrar continuidade da operação."
            if direction == ">" else
            "A falta de histórico detalhado da dívida foi tratada como fragilidade documental."
        )
    if feature_name == "laudo_referenciado":
        return (
            "O registro do canal de contratação ajudou a compor a narrativa probatória."
            if direction == ">" else
            "O registro do canal de contratação não apareceu com força suficiente nesta trilha."
        )
    if feature_name == "qtd_criticos":
        faixa = _format_count_boundary(direction, threshold)
        if direction == ">":
            return f"O caso entrou no ramo em que havia {faixa} documentos críticos, sinalizando uma base documental mais robusta."
        return f"O caso entrou no ramo em que havia {faixa} documentos críticos, mostrando uma prova ainda incompleta."
    if feature_name == "qtd_total_subsidios":
        faixa = _format_count_boundary(direction, threshold)
        if direction == ">":
            return f"O conjunto total de subsídios ficou na faixa de {faixa}, indicando algum suporte documental complementar."
        return f"O conjunto total de subsídios ficou na faixa de {faixa}, sugerindo um dossiê mais enxuto."
    if feature_name == "valor_causa":
        comparator = "acima" if direction == ">" else "até"
        return f"O valor da causa ficou {comparator} de {_format_currency(threshold)}, faixa que influenciou esta trilha do modelo."
    if feature_name == "log_valor_causa":
        return None

    return None


def _feature_consensus_label(feature_name: str, direction: str) -> Optional[str]:
    mapping = {
        ("contrato", ">"): "Presença de contrato ou biometria válida apareceu repetidamente como fator favorável à defesa.",
        ("contrato", "<="): "Ausência de contrato ou biometria válida apareceu repetidamente como fator de risco para a defesa.",
        ("extrato", ">"): "Presença de extrato ou TED em nome do cliente apareceu várias vezes como apoio à defesa.",
        ("extrato", "<="): "Ausência de extrato ou TED apareceu várias vezes como fragilidade relevante.",
        ("comprovante_de_credito", ">"): "Comprovante de liberação do crédito apareceu como suporte importante para a contratação.",
        ("comprovante_de_credito", "<="): "Ausência de comprovante de liberação do crédito se repetiu entre as árvores representativas.",
        ("dossie", ">"): "Dossiê conforme se repetiu como elemento que melhora a confiança na defesa.",
        ("dossie", "<="): "Falta de reforço do dossiê apareceu como ponto de cautela no modelo.",
        ("demonstrativo_de_evolucao_da_divida", ">"): "Histórico da dívida e dos pagamentos reforçou a tese defensiva em parte das árvores.",
        ("demonstrativo_de_evolucao_da_divida", "<="): "Ausência de histórico detalhado da dívida apareceu recorrentemente como fragilidade.",
        ("laudo_referenciado", ">"): "Registro do canal de contratação apareceu como apoio complementar à regularidade da operação.",
        ("laudo_referenciado", "<="): "A trilha do modelo não encontrou apoio consistente no registro do canal de contratação.",
        ("qtd_criticos", ">"): "Quantidade mais alta de documentos críticos ajudou parte das árvores a enxergar menor risco.",
        ("qtd_criticos", "<="): "Quantidade limitada de documentos críticos apareceu repetidamente como sinal de prova incompleta.",
        ("qtd_total_subsidios", ">"): "O conjunto total de subsídios ajudou, mas não resolveu sozinho a análise do caso.",
        ("qtd_total_subsidios", "<="): "Um conjunto mais enxuto de subsídios foi lido como sinal de cautela.",
    }
    return mapping.get((feature_name, direction))


def _extract_rf_narrative(model: Any, features_df: pd.DataFrame, case: CaseData) -> Dict[str, Any]:
    calibrated_prob = float(model.predict_proba(features_df)[0, 1])
    path_candidates: List[Dict[str, Any]] = []
    consensus_counter: Counter = Counter()

    for calibrated in model.calibrated_classifiers_:
        pipeline = calibrated.estimator
        preprocessor = pipeline.named_steps["preprocessor"]
        classifier = pipeline.named_steps["classifier"]
        classifier.n_jobs = 1

        transformed = preprocessor.transform(features_df)[0]
        raw_forest_prob = float(classifier.predict_proba([transformed])[0, 1])
        per_tree_probs = [float(tree.predict_proba([transformed])[0, 1]) for tree in classifier.estimators_]
        tree_idx = min(range(len(per_tree_probs)), key=lambda idx: abs(per_tree_probs[idx] - raw_forest_prob))
        representative_tree = classifier.estimators_[tree_idx]

        numeric_features = list(preprocessor.transformers_[0][2])
        categorical_features = preprocessor.named_transformers_["cat"].get_feature_names_out(preprocessor.transformers_[1][2]).tolist()
        binary_features = list(preprocessor.transformers_[2][2])
        feature_names = numeric_features + categorical_features + binary_features

        scaler = preprocessor.named_transformers_["num"]
        node_indicator = representative_tree.decision_path([transformed])
        leaf_id = representative_tree.apply([transformed])[0]
        path_node_ids = node_indicator.indices[node_indicator.indptr[0]:node_indicator.indptr[1]]

        decision_steps: List[Tuple[str, str]] = []
        ordered_sentences: List[str] = []
        seen_features = set()

        for node_id in path_node_ids:
            if node_id == leaf_id:
                continue

            feature_idx = representative_tree.tree_.feature[node_id]
            feature_name = feature_names[feature_idx]
            threshold = float(representative_tree.tree_.threshold[node_id])
            transformed_value = float(transformed[feature_idx])
            direction = "<=" if transformed_value <= threshold else ">"

            if feature_name in numeric_features:
                numeric_idx = numeric_features.index(feature_name)
                threshold_for_text = float((threshold * scaler.scale_[numeric_idx]) + scaler.mean_[numeric_idx])
                actual_value = float(features_df.iloc[0][feature_name])
            else:
                threshold_for_text = threshold
                actual_value = transformed_value

            sentence = _describe_condition(feature_name, direction, threshold_for_text, actual_value)
            if sentence and feature_name not in seen_features:
                ordered_sentences.append(sentence)
                decision_steps.append((feature_name, direction))
                consensus_counter[(feature_name, direction)] += 1
                seen_features.add(feature_name)

        leaf_distribution = representative_tree.tree_.value[leaf_id][0]
        path_candidates.append({
            "raw_forest_prob": raw_forest_prob,
            "ordered_sentences": ordered_sentences,
            "leaf_distribution": leaf_distribution,
            "decision_steps": decision_steps,
        })

    representative_path = min(path_candidates, key=lambda item: abs(item["raw_forest_prob"] - calibrated_prob))
    consensus_reasons: List[str] = []
    for (feature_name, direction), _count in consensus_counter.most_common(5):
        label = _feature_consensus_label(feature_name, direction)
        if label and label not in consensus_reasons:
            consensus_reasons.append(label)

    should_settle = calibrated_prob >= _THRESHOLD_ACORDO
    lead = (
        f"A recomendação é não sustentar a defesa até o fim e priorizar acordo, porque o Random Forest estimou risco de derrota de {_format_percent(calibrated_prob)}."
        if should_settle else
        f"A recomendação é defender, porque o Random Forest estimou risco de derrota de {_format_percent(calibrated_prob)}, abaixo do limite de acordo."
    )
    if consensus_reasons:
        explanation = lead + " Os fatores que mais se repetiram entre as árvores representativas foram: " + " ".join(consensus_reasons[:3])
    else:
        explanation = lead

    return {
        "plain_language_explanation": explanation,
        "decision_path": representative_path["ordered_sentences"][:6],
        "forest_consensus_reasons": consensus_reasons[:5],
    }


def _build_rule_narrative(
    case: CaseData,
    recommendation: str,
    summary: str,
    path_steps: List[str],
    repeated_reasons: List[str],
) -> Dict[str, Any]:
    return {
        "plain_language_explanation": summary,
        "decision_path": path_steps,
        "forest_consensus_reasons": repeated_reasons,
    }


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
        applied_rules.append("Auditoria Probatória: Dossiê Grafotécnico/Facial atesta divergência de assinatura/biometria (Fraude Confirmada).")
        applied_rules.append("Aplicação da Súmula 479/STJ (Responsabilidade objetiva por fortuito interno).")
        applied_rules.append("Recomendação de Acordo Fast-Track para mitigar perícia judicial onerosa, condenação de danos morais majorados e multa por má-fé.")
        
        prob_derrota = 0.98
        pricing = calculate_pricing(
            valor_causa=case.valor_causa,
            prob_derrota=prob_derrota,
            uf=case.uf
        )
        narrative = _build_rule_narrative(
            case=case,
            recommendation=RecommendationType.ACORDO.value,
            summary=(
                "A recomendação é não defender até o fim e buscar acordo, porque o dossiê técnico apontou indício forte de fraude, "
                "o que deixa a defesa do banco muito exposta."
            ),
            path_steps=[
                "O dossiê técnico foi classificado como não conforme.",
                "Isso indica divergência relevante de assinatura, biometria ou autenticidade documental.",
                "Com essa fragilidade, a chance de sustentar a regularidade da contratação cai de forma importante.",
                "Por isso, a estratégia mais segura passa a ser acordo, e não insistência na defesa."
            ],
            repeated_reasons=[
                "O principal fator de risco foi a inconsistência do dossiê técnico.",
                "Quando a autenticidade da contratação fica comprometida, a defesa perde força estrutural.",
                "Nesse cenário, insistir na defesa tende a aumentar exposição financeira e processual."
            ],
        )
        return PolicyResult(
            recommendation=RecommendationType.ACORDO.value,
            reasoning_code=ReasoningCode.DOSSIE_NAO_CONFORME.value,
            confidence_score=0.98,
            risk_level=RiskLevel.CRITICO.value,
            settlement_pricing=pricing,
            applied_rules=applied_rules,
            **narrative,
        )
        
    # Contagem de subsídios críticos disponíveis
    num_criticos = sum([int(sub.contrato), int(sub.extrato), int(sub.comprovante_credito)])
    
    # -------------------------------------------------------------
    # REGRA 2: Cadeia Probatória Completa (3 Críticos Presentes)
    # -------------------------------------------------------------
    if num_criticos == 3:
        applied_rules.append("Força Probatória Plena: Contrato Assinado (CCB) + Comprovante de TED + Registro BACEN localizados.")
        if sub.demonstrativo_divida:
            applied_rules.append("Histórico de amortização/descontos regulares demonstra conhecimento e usufruto prévio da operação.")
        applied_rules.append("Art. 373, II, CPC atendido integralmente: Fato impeditivo/modificativo do direito do autor comprovado.")
        applied_rules.append("Taxa histórica de êxito no tribunal superior a 95.9% para este perfil probatório.")
        narrative = _build_rule_narrative(
            case=case,
            recommendation=RecommendationType.DEFESA.value,
            summary=(
                "A recomendação é defender, porque os principais documentos da contratação foram localizados e formam uma cadeia probatória consistente."
            ),
            path_steps=[
                "O caso conta com contrato, extrato ou TED e comprovante de crédito.",
                "Esse conjunto mostra origem da contratação, liberação do valor e vínculo com a operação discutida.",
                "Quando disponível, o histórico da dívida reforça que houve acompanhamento ou utilização do crédito.",
                "Com essa base documental, a defesa fica tecnicamente sustentada."
            ],
            repeated_reasons=[
                "O principal fator favorável foi a presença da cadeia documental completa.",
                "A contratação ficou amparada por provas materiais centrais.",
                "Nesse cenário, a tese defensiva parte de uma posição probatória mais sólida."
            ],
        )
        return PolicyResult(
            recommendation=RecommendationType.DEFESA.value,
            reasoning_code=ReasoningCode.CADEIA_COMPLETA.value,
            confidence_score=0.95,
            risk_level=RiskLevel.BAIXO.value,
            settlement_pricing=None,
            applied_rules=applied_rules,
            **narrative,
        )
        
    # -------------------------------------------------------------
    # REGRA 3: Falha Probatória Severa (0 a 1 Crítico Presente)
    # -------------------------------------------------------------
    if num_criticos <= 1:
        applied_rules.append(f"Falha Probatória Severa: Apenas {num_criticos} de 3 documentos essenciais localizados nos sistemas do banco.")
        if not sub.contrato:
            applied_rules.append("Ausência de Cédula de Crédito Bancário (CCB) assinada ou com biometria válida.")
        if not sub.extrato:
            applied_rules.append("Ausência de comprovante de TED/depósito na conta de titularidade do consumidor.")
        applied_rules.append("Aplicação do art. 6º, VIII do CDC: Inversão do ônus da prova tornará a condenação quase certa.")
        applied_rules.append("Probabilidade histórica de derrota superior a 81% (podendo atingir 98.6% sem contrato e extrato).")
        
        prob_derrota = 0.98 if num_criticos == 0 else 0.82
        pricing = calculate_pricing(
            valor_causa=case.valor_causa,
            prob_derrota=prob_derrota,
            uf=case.uf
        )
        missing_items = []
        if not sub.contrato:
            missing_items.append("contrato")
        if not sub.extrato:
            missing_items.append("extrato ou TED")
        if not sub.comprovante_credito:
            missing_items.append("comprovante de crédito")
        missing_text = ", ".join(missing_items) if missing_items else "documentos centrais"
        narrative = _build_rule_narrative(
            case=case,
            recommendation=RecommendationType.ACORDO.value,
            summary=(
                "A recomendação é não sustentar a defesa até o fim e priorizar acordo, porque faltam documentos essenciais para provar a regularidade da contratação."
            ),
            path_steps=[
                f"O processo chegou sem prova suficiente de {missing_text}.",
                "Isso impede mostrar com segurança a formação e a execução regular da operação.",
                "Com prova documental tão limitada, a defesa tende a enfrentar alto risco de derrota.",
                "Por isso, a resposta estratégica mais segura é negociar acordo."
            ],
            repeated_reasons=[
                "O principal fator de risco foi a ausência de documentos críticos da contratação.",
                "Sem prova central, a narrativa defensiva perde sustentação logo no início.",
                "Nesse cenário, insistir na defesa tende a custar mais do que compor o caso."
            ],
        )
        return PolicyResult(
            recommendation=RecommendationType.ACORDO.value,
            reasoning_code=ReasoningCode.FALHA_PROBATORIA.value,
            confidence_score=0.90 if num_criticos == 1 else 0.97,
            risk_level=RiskLevel.ALTO.value if num_criticos == 1 else RiskLevel.CRITICO.value,
            settlement_pricing=pricing,
            applied_rules=applied_rules,
            **narrative,
        )
        
    # -------------------------------------------------------------
    # REGRA 4: Zona Cinzenta (2 Críticos Presentes) -> Random Forest
    # -------------------------------------------------------------
    applied_rules.append("Zona Cinzenta Probatória: 2 de 3 documentos críticos localizados. Ativação do Modelo Jurimétrico Random Forest Calibrado.")
    
    features_df = _build_features_df(case, dossie_status, num_criticos)
    
    model = get_model()
    if model is not None:
        try:
            prob_derrota = float(model.predict_proba(features_df)[0, 1])
            applied_rules.append(f"Classificador Random Forest Calibrado estimou probabilidade de derrota em {prob_derrota*100:.1f}% para a comarca ({case.uf}).")
            try:
                rf_narrative = _extract_rf_narrative(model, features_df, case)
            except Exception:
                # A failure to explain the model must not replace its prediction.
                applied_rules.append("A explicação detalhada das árvores está indisponível; a predição do modelo foi preservada.")
                rf_narrative = {
                    "plain_language_explanation": (
                        f"O modelo estimou risco de derrota em {_format_percent(prob_derrota)}. "
                        "A leitura detalhada das árvores não está disponível para esta avaliação."
                    ),
                    "decision_path": [],
                    "forest_consensus_reasons": [],
                }
        except Exception as e:
            prob_derrota = 0.35 if sub.contrato and sub.extrato else 0.50
            applied_rules.append(f"Fallback estatístico ativado ({e}): probabilidade estimada em {prob_derrota*100:.1f}%.")
            rf_narrative = {
                "plain_language_explanation": (
                    f"A recomendação foi baseada em uma estimativa de contingência, porque a leitura detalhada do Random Forest falhou. "
                    f"Ainda assim, o risco calculado de derrota ficou em {_format_percent(prob_derrota)}."
                ),
                "decision_path": [],
                "forest_consensus_reasons": [],
            }
    else:
        # Fallback heurístico calibrado na base histórica caso o .pkl não esteja acessível
        prob_derrota = 0.13 if (sub.contrato and sub.extrato) else 0.47
        applied_rules.append(f"Estimador jurimétrico de contingência: probabilidade estimada em {prob_derrota*100:.1f}%.")
        rf_narrative = {
            "plain_language_explanation": (
                f"A recomendação foi construída por estimativa de contingência, porque o artefato do Random Forest não estava acessível. "
                f"O risco calculado de derrota ficou em {_format_percent(prob_derrota)}."
            ),
            "decision_path": [],
            "forest_consensus_reasons": [],
        }
        
    # Limiar de corte de decisão estratégica na zona cinzenta
    # Se a probabilidade de condenação for >= 40%, o banco prefere estancar o custo via acordo
    if prob_derrota >= _THRESHOLD_ACORDO:
        applied_rules.append(f"Risco de condenação ({prob_derrota*100:.1f}%) supera a tolerância de contencioso ({_THRESHOLD_ACORDO*100:.0f}%). Proposta de acordo recomendada.")
        pricing = calculate_pricing(
            valor_causa=case.valor_causa,
            prob_derrota=prob_derrota,
            uf=case.uf
        )
        return PolicyResult(
            recommendation=RecommendationType.ACORDO.value,
            reasoning_code=ReasoningCode.ML_ZONA_CINZENTA.value,
            confidence_score=round(prob_derrota, 2),
            confidence_score_semantics="loss_probability",
            risk_level=RiskLevel.MEDIO.value if prob_derrota < 0.70 else RiskLevel.ALTO.value,
            settlement_pricing=pricing,
            applied_rules=applied_rules,
            **rf_narrative,
        )
    else:
        confianca_vitoria = 1.0 - prob_derrota
        applied_rules.append(f"Risco de condenação sob controle ({prob_derrota*100:.1f}%). Probabilidade de êxito de {confianca_vitoria*100:.1f}% justifica defesa técnica.")
        return PolicyResult(
            recommendation=RecommendationType.DEFESA.value,
            reasoning_code=ReasoningCode.ML_ZONA_CINZENTA.value,
            confidence_score=round(confianca_vitoria, 2),
            risk_level=RiskLevel.BAIXO.value if prob_derrota < 0.20 else RiskLevel.MEDIO.value,
            settlement_pricing=None,
            applied_rules=applied_rules,
            **rf_narrative,
        )
