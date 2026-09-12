"""
Testes Unitários da Engine de Decisão Jurídica (src/policy/engine.py).
Frente da Pessoa 1.
"""

import pytest
from src.policy.engine import evaluate_case
from src.policy.schemas import PolicyResult, CaseData, SubsidiesInput, RecommendationType, ReasoningCode, RiskLevel


def test_rule_1_dossie_nao_conforme():
    """Regra 1: Dossiê Não Conforme (fraude confirmada) deve recomendar Acordo Fast-Track."""
    case = {
        "numero_processo": "0801234-56.2024.8.10.0001",
        "uf": "MA",
        "valor_causa": 15000.0,
        "subsidios": {
            "contrato": True,
            "extrato": True,
            "comprovante_credito": True,
            "dossie": "NAO_CONFORME"
        }
    }
    result = evaluate_case(case)
    
    assert isinstance(result, PolicyResult)
    assert result.recommendation == "ACORDO"
    assert result.reasoning_code == "DOSSIE_NAO_CONFORME"
    assert result.risk_level == "CRITICO"
    assert result.confidence_score >= 0.95
    assert result.settlement_pricing is not None
    assert result.settlement_pricing.floor < result.settlement_pricing.target < result.settlement_pricing.ceiling
    assert any("Súmula 479/STJ" in rule for rule in result.applied_rules)


def test_rule_2_cadeia_completa_defesa():
    """Regra 2: 3 subsídios críticos e dossiê conforme devem recomendar Defesa robusta."""
    case = {
        "numero_processo": "0654321-09.2024.8.04.0001",
        "uf": "AM",
        "valor_causa": 9000.0,
        "subsidios": {
            "contrato": True,
            "extrato": True,
            "comprovante_credito": True,
            "dossie": "CONFORME",
            "demonstrativo_divida": True
        }
    }
    result = evaluate_case(case)
    
    assert result.recommendation == "DEFESA"
    assert result.reasoning_code == "CADEIA_COMPLETA"
    assert result.risk_level == "BAIXO"
    assert result.confidence_score >= 0.90
    assert result.settlement_pricing is None
    assert any("373, II, CPC" in rule for rule in result.applied_rules)


def test_rule_3_falha_probatoria_severa():
    """Regra 3: Falha probatória grave (0 ou 1 crítico) deve recomendar Acordo imediato."""
    # Subcaso A: 0 críticos
    case_0 = {
        "numero_processo": "1234567-89.2025.8.26.0100",
        "uf": "SP",
        "valor_causa": 20000.0,
        "subsidios": {
            "contrato": False,
            "extrato": False,
            "comprovante_credito": False
        }
    }
    result_0 = evaluate_case(case_0)
    assert result_0.recommendation == "ACORDO"
    assert result_0.reasoning_code == "FALHA_PROBATORIA"
    assert result_0.risk_level == "CRITICO"
    assert result_0.settlement_pricing is not None

    # Subcaso B: 1 crítico apenas (ex: só tem BACEN, sem contrato e sem extrato)
    case_1 = {
        "numero_processo": "2345678-90.2025.8.13.0024",
        "uf": "MG",
        "valor_causa": 12000.0,
        "subsidios": {
            "contrato": False,
            "extrato": False,
            "comprovante_credito": True
        }
    }
    result_1 = evaluate_case(case_1)
    assert result_1.recommendation == "ACORDO"
    assert result_1.reasoning_code == "FALHA_PROBATORIA"
    assert result_1.settlement_pricing is not None


def test_rule_4_zona_cinzenta_ml():
    """Regra 4: 2 críticos disparam o modelo Random Forest calibrado."""
    case = {
        "numero_processo": "3456789-01.2025.8.05.0001",
        "uf": "BA",
        "valor_causa": 18000.0,
        "subsidios": {
            "contrato": False,
            "extrato": True,
            "comprovante_credito": True
        }
    }
    result = evaluate_case(case)
    assert result.reasoning_code == "ML_ZONA_CINZENTA"
    assert result.recommendation in ["DEFESA", "ACORDO"]
    assert 0.0 <= result.confidence_score <= 1.0
    if result.recommendation == "ACORDO":
        assert result.settlement_pricing is not None


def test_input_pydantic_direct():
    """Garante que a função aceita tanto dict quanto instância direta de CaseData."""
    sub = SubsidiesInput(contrato=True, extrato=True, comprovante_credito=True)
    cdata = CaseData(
        numero_processo="9999999-99.2025.8.26.0000",
        uf="SP",
        valor_causa=10000.0,
        subsidios=sub
    )
    result = evaluate_case(cdata)
    assert result.recommendation == "DEFESA"
    assert result.reasoning_code == "CADEIA_COMPLETA"
