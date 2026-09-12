"""
Testes Unitários do Motor de Precificação Atuarial (src/policy/pricing.py).
Frente da Pessoa 1.
"""

import pytest
from src.policy.pricing import calculate_pricing
from src.policy.schemas import SettlementPricing


def test_calculate_pricing_basic_bounds():
    """Valida se a régua de alçada respeita a hierarquia piso < alvo < teto."""
    pricing = calculate_pricing(
        valor_causa=10000.0,
        prob_derrota=0.80,
        uf="SP"
    )
    
    assert isinstance(pricing, SettlementPricing)
    assert pricing.floor > 0
    assert pricing.floor < pricing.target
    assert pricing.target < pricing.ceiling
    assert pricing.expected_loss > 0


def test_calculate_pricing_risk_sensitivity():
    """Maior probabilidade de condenação deve gerar maior perda esperada e maior alçada de acordo."""
    pricing_baixo_risco = calculate_pricing(valor_causa=12000.0, prob_derrota=0.20, uf="SP")
    pricing_alto_risco = calculate_pricing(valor_causa=12000.0, prob_derrota=0.90, uf="SP")
    
    assert pricing_alto_risco.expected_loss > pricing_baixo_risco.expected_loss
    assert pricing_alto_risco.target > pricing_baixo_risco.target
    assert pricing_alto_risco.ceiling > pricing_baixo_risco.ceiling


def test_calculate_pricing_uf_sensitivity():
    """UFs com histórico de maior rigor indenizatório (ex: AM) devem refletir no cálculo."""
    pricing_am = calculate_pricing(valor_causa=10000.0, prob_derrota=0.80, uf="AM")
    pricing_ma = calculate_pricing(valor_causa=10000.0, prob_derrota=0.80, uf="MA")
    
    assert pricing_am.expected_loss > pricing_ma.expected_loss
