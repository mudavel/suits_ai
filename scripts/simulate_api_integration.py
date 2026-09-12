"""
Script de Simulação da Integração: Backend FastAPI (Pessoa 2) consumindo o Motor Jurídico (Pessoa 1).
Demonstra o funcionamento do endpoint oficial POST /api/analyze especificado no SPEC.md.
"""

import sys
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

# Garante que a raiz do projeto esteja no sys.path
root_dir = Path(__file__).resolve().parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# Garante compatibilidade UTF-8 no Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# 1. Importação dos contratos Pydantic e da Engine construídos pela Pessoa 1
from src.policy.schemas import CaseData, PolicyResult
from src.policy.engine import evaluate_case

# 2. Inicialização do servidor FastAPI da Pessoa 2
app = FastAPI(
    title="EnterOS - API de Governança Jurídica (Banco Unicamp)",
    description="Endpoints para triagem e tomada de decisão estratégica de processos massificados.",
    version="1.0.0"
)


@app.post("/api/analyze", response_model=PolicyResult, summary="Análise Estratégica do Processo")
def analyze_case_endpoint(case: CaseData):
    """
    Endpoint consumido pelo Frontend React (Pessoa 3) para obter a decisão (DEFESA ou ACORDO),
    nível de risco, confiança, trilha de regras e precificação atuarial.
    """
    try:
        # Chama a função pura construída pela Pessoa 1
        result = evaluate_case(case)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento da decisão: {str(e)}")


def main():
    print("=" * 75)
    print("🚀 SIMULAÇÃO DA INTEGRAÇÃO BACKEND FASTAPI (PESSOA 2) -> ENGINE (PESSOA 1)")
    print("=" * 75)
    
    client = TestClient(app)
    
    # -------------------------------------------------------------------------
    # Teste 1: Simulação do Caso 01 do Hackathon (Cadeia Probatória Completa)
    # -------------------------------------------------------------------------
    payload_caso_01 = {
        "numero_processo": "0801234-56.2024.8.10.0001",
        "uf": "MA",
        "valor_causa": 15000.0,
        "assunto": "Empréstimo consignado",
        "sub_assunto": "Não reconhecimento de contratação",
        "subsidios": {
            "contrato": True,
            "extrato": True,
            "comprovante_credito": True,
            "dossie": "CONFORME",
            "demonstrativo_divida": True,
            "laudo_referenciado": True
        }
    }
    
    print("\n📩 [POST /api/analyze] Enviando Caso 01 (Autos com todos os subsídios)...")
    res1 = client.post("/api/analyze", json=payload_caso_01)
    print(f"Status HTTP: {res1.status_code} OK")
    print("Resposta JSON devolvida para o Frontend:")
    print(json.dumps(res1.json(), indent=2, ensure_ascii=False))
    
    # -------------------------------------------------------------------------
    # Teste 2: Simulação do Caso 02 do Hackathon (Falha Probatória Severa)
    # -------------------------------------------------------------------------
    payload_caso_02 = {
        "numero_processo": "0654321-09.2024.8.04.0001",
        "uf": "AM",
        "valor_causa": 18500.0,
        "assunto": "Empréstimo consignado",
        "sub_assunto": "Não reconhecimento de contratação",
        "subsidios": {
            "contrato": False,           # Ausência da CCB
            "extrato": False,            # Ausência de comprovante de TED
            "comprovante_credito": True, # Apenas registro no BACEN
            "demonstrativo_divida": True,
            "laudo_referenciado": True
        }
    }
    
    print("\n" + "-" * 75)
    print("📩 [POST /api/analyze] Enviando Caso 02 (Sem contrato e sem comprovante de TED)...")
    res2 = client.post("/api/analyze", json=payload_caso_02)
    print(f"Status HTTP: {res2.status_code} OK")
    print("Resposta JSON devolvida para o Frontend:")
    print(json.dumps(res2.json(), indent=2, ensure_ascii=False))
    
    # -------------------------------------------------------------------------
    # Teste 3: Simulação de Zona Cinzenta avaliada pelo Random Forest
    # -------------------------------------------------------------------------
    payload_caso_zona_cinzenta = {
        "numero_processo": "1234567-89.2025.8.26.0100",
        "uf": "SP",
        "valor_causa": 22000.0,
        "subsidios": {
            "contrato": True,
            "extrato": True,
            "comprovante_credito": False,
            "dossie": "CONFORME",
            "demonstrativo_divida": False,
            "laudo_referenciado": True
        }
    }
    
    print("\n" + "-" * 75)
    print("📩 [POST /api/analyze] Enviando Caso de Zona Cinzenta (2 críticos: avaliado por ML)...")
    res3 = client.post("/api/analyze", json=payload_caso_zona_cinzenta)
    print(f"Status HTTP: {res3.status_code} OK")
    print("Resposta JSON devolvida para o Frontend:")
    print(json.dumps(res3.json(), indent=2, ensure_ascii=False))
    
    print("\n" + "=" * 75)
    print("✅ INTEGRAÇÃO VALIDADA! O motor da Pessoa 1 está pronto para o backend FastAPI.")
    print("=" * 75)


if __name__ == "__main__":
    main()
