"""
Schemas Pydantic para a Política Inteligente de Acordos e Governança Jurídica.
Define os contratos de interface oficiais entre o Motor de Decisão (Pessoa 1),
o Backend FastAPI (Pessoa 2) e os Dashboards de Governança (Pessoa 4).
"""

from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


class RecommendationType(str, Enum):
    DEFESA = "DEFESA"
    ACORDO = "ACORDO"


class ReasoningCode(str, Enum):
    DOSSIE_NAO_CONFORME = "DOSSIE_NAO_CONFORME"
    CADEIA_COMPLETA = "CADEIA_COMPLETA"
    FALHA_PROBATORIA = "FALHA_PROBATORIA"
    ML_ZONA_CINZENTA = "ML_ZONA_CINZENTA"
    USUFRUTO_COMPROVADO = "USUFRUTO_COMPROVADO"


class RiskLevel(str, Enum):
    BAIXO = "BAIXO"
    MEDIO = "MEDIO"
    ALTO = "ALTO"
    CRITICO = "CRITICO"


class SettlementPricing(BaseModel):
    """
    Régua de alçada atuarial para processos recomendados para ACORDO.
    Valores em Reais (BRL).
    """
    floor: float = Field(
        ...,
        description="Piso de abertura da proposta de acordo (~60% do alvo)"
    )
    target: float = Field(
        ...,
        description="Valor alvo ótimo de conversão financeira"
    )
    ceiling: float = Field(
        ...,
        description="Teto máximo autorizado antes de exigir aprovação da diretoria"
    )
    expected_loss: float = Field(
        ...,
        description="Custo esperado atuarial da condenação E[Perda]"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "floor": 1800.00,
                "target": 3000.00,
                "ceiling": 4200.00,
                "expected_loss": 5250.00
            }
        }
    )


class PolicyResult(BaseModel):
    """
    Resultado estruturado emitido pelo Motor de Decisão Jurídico.
    Consumido pelo endpoint /api/analyze do FastAPI e pela UI do advogado.
    """
    recommendation: str = Field(
        ...,
        description="Recomendação estratégica: 'DEFESA' ou 'ACORDO'"
    )
    reasoning_code: str = Field(
        ...,
        description="Código padronizado do motivo da decisão"
    )
    confidence_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Grau de confiança da recomendação (0.0 a 1.0)"
    )
    risk_level: str = Field(
        ...,
        description="Nível de risco contencioso: 'BAIXO', 'MEDIO', 'ALTO' ou 'CRITICO'"
    )
    settlement_pricing: Optional[SettlementPricing] = Field(
        default=None,
        description="Precificação atuarial preenchida caso a recomendação seja ACORDO"
    )
    applied_rules: List[str] = Field(
        default_factory=list,
        description="Trilha de auditoria das regras probatórias e jurimétricas disparadas"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "recommendation": "ACORDO",
                "reasoning_code": "DOSSIE_NAO_CONFORME",
                "confidence_score": 0.98,
                "risk_level": "CRITICO",
                "settlement_pricing": {
                    "floor": 2100.0,
                    "target": 3500.0,
                    "ceiling": 4900.0,
                    "expected_loss": 6200.0
                },
                "applied_rules": [
                    "Auditoria Probatória: Dossiê Grafotécnico/Facial classificado como NÃO CONFORME",
                    "Aplicação Súmula 479/STJ e estancamento de dano moral massificado",
                    "Ativação de Acordo Fast-Track com régua atuarial de negociação"
                ]
            }
        }
    )


class SubsidiesInput(BaseModel):
    """
    Status de presença dos subsídios documentais do Banco Unicamp.
    Aceita booleanos (True/False) ou indicadores binários numéricos (1/0).
    """
    contrato: bool = Field(False, description="Cédula de Crédito Bancário (CCB)")
    extrato: bool = Field(False, description="Comprovante de depósito/TED na conta do autor")
    comprovante_credito: bool = Field(False, description="Registro regulatório no BACEN")
    dossie: Optional[str] = Field(
        None,
        description="Resultado da perícia prévia: 'CONFORME', 'NAO_CONFORME' ou 'AUSENTE'"
    )
    demonstrativo_divida: bool = Field(False, description="Evolução da dívida e histórico de pagamentos")
    laudo_referenciado: bool = Field(False, description="Síntese do canal de contratação")

    @field_validator("dossie", mode="before")
    def normalize_dossie(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, (int, float)):
            # Na planilha, 1.0 costuma significar fornecido/conforme
            return "CONFORME" if v == 1.0 else "AUSENTE"
        val = str(v).strip().upper()
        if "NÃO" in val or "NAO" in val or "FRAUDE" in val or "DIVERGENTE" in val:
            return "NAO_CONFORME"
        if "CONFORME" in val or "AUTENTICO" in val or "AUTÊNTICO" in val or val == "1":
            return "CONFORME"
        if "AUSENTE" in val or val in ("0", "", "NONE", "NAN"):
            return "AUSENTE"
        return val


class CaseData(BaseModel):
    """
    Dados de entrada completos para análise de um processo judicial.
    """
    numero_processo: str = Field(..., description="Número CNJ do processo")
    uf: str = Field(..., description="Unidade Federativa (UF) do tribunal")
    valor_causa: float = Field(..., gt=0.0, description="Valor da causa atribuído na petição inicial")
    assunto: Optional[str] = Field(default="Empréstimo consignado", description="Ramo cível da demanda")
    sub_assunto: Optional[str] = Field(default="Não reconhecimento de contratação", description="Tese da ação")
    subsidios: SubsidiesInput = Field(default_factory=SubsidiesInput, description="Subsídios fornecidos")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadados adicionais do caso")
