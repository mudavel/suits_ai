"""
Motor de Precificação Atuarial para Políticas de Acordo (Banco Unicamp).
Frente exclusiva da Pessoa 1 (Data Science & Jurimetrics Lead).

Implementa:
- Estimativa do Custo Esperado de Condenação: E[Perda] = P(derrota) * (Dano Material + Dano Moral UF + Custas).
- Régua de alçada de negociação para o advogado:
  * Piso de Abertura (~60% do Alvo)
  * Valor Alvo (~55% do E[Perda], garantindo ~45% de economia líquida)
  * Teto de Alçada (~85% do E[Perda], teto máximo antes de aprovação da diretoria)
"""

from typing import Dict, Optional
from .schemas import SettlementPricing

# Dano moral histórico e ticket médio de condenação apurado nas 60.000 sentenças
UF_CONDENACAO_MEDIAN = {
    "AC": 9572.78, "AL": 9823.82, "AM": 12517.33, "AP": 12070.61, "BA": 11556.03,
    "CE": 9595.16, "DF": 9568.43, "ES": 9464.05,  "GO": 10254.04, "MA": 7618.71,
    "MG": 9472.70, "MS": 7909.41, "MT": 8411.71,  "PA": 9642.88,  "PB": 9479.57,
    "PE": 10016.55,"PI": 10366.24,"PR": 9676.29,  "RJ": 9627.13,  "RN": 10122.09,
    "RO": 9940.77, "RS": 10381.38,"SC": 9820.41,  "SE": 9556.08,  "SP": 9734.02,
    "TO": 9664.74
}

MEDIA_NACIONAL_CONDENACAO = 10564.56
PERCENTUAL_HONORARIOS_CUSTAS = 0.15   # 10% a 20% art. 85 CPC
MARGEM_ECONOMIA_ALVO = 0.45          # Economia de 45% sobre a perda esperada


def calculate_pricing(
    valor_causa: float,
    prob_derrota: float,
    uf: Optional[str] = "SP",
    honorarios_pct: float = PERCENTUAL_HONORARIOS_CUSTAS
) -> SettlementPricing:
    """
    Calcula o valor atuarial de perda esperada e a régua de alçada para acordos judiciais.
    
    Args:
        valor_causa: Valor da causa apontado na petição inicial do autor.
        prob_derrota: Probabilidade calibrada de derrota (0.0 a 1.0).
        uf: Unidade federativa do processo para calibrar a média regional de dano moral.
        honorarios_pct: Percentual estimado de honorários sucumbenciais e custas periciais judiciais.
        
    Returns:
        SettlementPricing com floor (piso), target (alvo), ceiling (teto) e expected_loss.
    """
    prob_derrota = max(0.01, min(1.0, float(prob_derrota)))
    valor_causa = max(100.0, float(valor_causa))
    
    uf_normalized = str(uf).strip().upper() if uf else "SP"
    dano_medio_uf = UF_CONDENACAO_MEDIAN.get(uf_normalized, MEDIA_NACIONAL_CONDENACAO)
    
    # Fórmula atuarial (SOLUTION.md Seção 5):
    # Condenação Bruta = Débito Material Restituível + Dano Moral Regional (UF)
    # Em ações cíveis de consignado, o dano moral varia significativamente por tribunal regional
    debito_material = min(valor_causa * 0.65, 15000.0)
    dano_moral_regional = dano_medio_uf * 0.35
    
    estimativa_condenacao_bruta = debito_material + dano_moral_regional
    custas_e_honorarios = estimativa_condenacao_bruta * honorarios_pct
    
    perda_total_se_perder = estimativa_condenacao_bruta + custas_e_honorarios
    
    # E[Perda] = P(derrota) * (Condenação + Custas/Honorários)
    expected_loss = prob_derrota * perda_total_se_perder
    
    # Régua de Alçada:
    # 1. Valor Alvo: Ponto de equilíbrio ótimo que gera ~45% de economia (Cost Avoidance)
    target = expected_loss * (1.0 - MARGEM_ECONOMIA_ALVO)
    target = max(target, 300.0)  # Piso financeiro mínimo de acordo operacional
    
    # 2. Piso de Abertura: ~60% do Alvo, dando margem de barganha ao negociador do banco
    floor = target * 0.60
    
    # 3. Teto de Alçada: Limite máximo autorizado ao advogado (~85% do E[Perda])
    ceiling = min(expected_loss * 0.85, valor_causa * 0.80)
    ceiling = max(ceiling, target * 1.15)  # Garante teto estritamente superior ao alvo
    
    return SettlementPricing(
        floor=round(floor, 2),
        target=round(target, 2),
        ceiling=round(ceiling, 2),
        expected_loss=round(expected_loss, 2)
    )
