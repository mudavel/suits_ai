"""Tradução explícita de CaseDetail para o CaseData publicado pela branch 1.

Não calcula features do modelo nem altera decisões, scores ou pricing.
"""

import unicodedata

from fastapi import HTTPException

from src.backend.schemas import CaseDetail


def policy_input(case: CaseDetail) -> tuple[dict, list[str]]:
    if case.cause_value <= 0:
        raise HTTPException(422, "O motor exige valor da causa positivo; revise os dados do caso.")
    warnings = []
    dossier = "AUSENTE"
    if case.subsidies.has_dossier:
        dossier_ids = {d.id for d in case.documents if d.document_type == "DOSSIE"}
        verdicts = set()
        unknown = False
        translations = {"CONFORMIDADE": "CONFORME", "CONFORME": "CONFORME",
            "NAO CONFORMIDADE": "NAO_CONFORME", "NAO CONFORME": "NAO_CONFORME"}
        for fact in case.facts:
            if fact.field != "dossier_conformity" or fact.source.document_id not in dossier_ids:
                continue
            value = "".join(c for c in unicodedata.normalize("NFKD", fact.value) if not unicodedata.combining(c))
            value = " ".join(value.upper().replace("_", " ").split())
            if value in translations:
                verdicts.add(translations[value])
            else:
                unknown = True
        if len(verdicts) > 1:
            raise HTTPException(422, "Conclusões divergentes nos dossiês; revise antes de consultar o motor.")
        dossier = next(iter(verdicts)) if verdicts and not unknown else None
        if dossier is None:
            warnings.append("Dossiê presente sem conclusão documental inequívoca; dossie enviado ao motor como null.")
    sub = case.subsidies
    return {
        "numero_processo": case.case_number,
        "uf": case.uf,
        "valor_causa": case.cause_value,
        "assunto": None,
        "sub_assunto": case.sub_issue,
        "subsidios": {
            "contrato": sub.has_contract,
            "extrato": sub.has_statement,
            "comprovante_credito": sub.has_credit_receipt,
            "dossie": dossier,
            "demonstrativo_divida": sub.has_debt_evolution,
            "laudo_referenciado": sub.has_referenced_report,
        },
        "metadata": {"case_id": case.id, "case_version": case.version,
            "data_mode": case.data_mode, "is_simulated": case.is_simulated},
    }, warnings
