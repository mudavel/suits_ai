"""Leitura dos ZIPs fornecidos, com evidência por página e sem extrair caminhos."""

import hashlib
import re
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile

from pypdf import PdfReader

from src.backend.schemas import (
    CaseDetail, CaseDocument, DocumentCheck, DocumentContent, DocumentPage,
    ExtractedFact, SourceReference, SubsidyPresence,
)

ARCHIVES = {
    1: "Caso_01_0801234-56-2024-8-10-0001.zip",
    2: "Caso_02_0654321-09-2024-8-04-0001.zip",
}
KINDS = {
    "Autos_Processo": "AUTOS", "Contrato_": "CONTRATO", "Extrato_": "EXTRATO",
    "Comprovante_de_Credito": "COMPROVANTE_CREDITO", "Dossie_": "DOSSIE",
    "Evolucao_Divida": "EVOLUCAO_DIVIDA", "Laudo_": "LAUDO_REFERENCIADO",
}
FLAGS = {
    "has_contract": "CONTRATO", "has_statement": "EXTRATO",
    "has_credit_receipt": "COMPROVANTE_CREDITO", "has_dossier": "DOSSIE",
    "has_debt_evolution": "EVOLUCAO_DIVIDA", "has_referenced_report": "LAUDO_REFERENCIADO",
}


def reference(document: CaseDocument, page: int, text: str) -> SourceReference:
    return SourceReference(
        source_id=f"{document.id}:p{page}", document_id=document.id,
        document_name=document.name, page=page, excerpt=" ".join(text.split())[:1400],
    )


def extract_facts(document: CaseDocument, pages: list[DocumentPage]) -> list[ExtractedFact]:
    patterns = {
        "cpf": r"(?<![\d.])\b(\d{3}\.\d{3}\.\d{3}-\d{2})\b",
        "claimant_name": r"(?:OUTORGANTE:\s*|TOMADOR \(DEVEDOR\)\s*|Nome completo\s*|TOMADOR - Nome\s*|Cliente:\s*)([^,\n]+)",
        "contract_number": r"(?:Contrato\s*n[º°o.]?\s*|Nº do contrato\s*|Contr\.\s*)(\d{6,})",
        "loan_amount": r"(?:Valor líquido liberado|Valor liberado|Valor da operação \(líquido\)|Valor financiado)\s*R\$\s*([\d.,]+)",
        "cause_value": r"Dá-se à causa o valor de R\$\s*([\d.,]+)",
        "dossier_conformity": r"Parecer geral:\s*(NÃO CONFORMIDADE|CONFORMIDADE)",
    }
    facts = []
    seen = set()
    for page in pages:
        for field, pattern in patterns.items():
            for match in re.finditer(pattern, page.text, re.I):
                value = match.group(1).strip()
                if field in {"loan_amount", "cause_value"}:
                    value = value.replace(".", "").replace(",", ".")
                if (field, value) not in seen:
                    seen.add((field, value))
                    facts.append(ExtractedFact(
                        field=field, value=value,
                        source=reference(document, page.number, page.text[max(0, match.start()-60):match.end()+160]),
                    ))
        if document.document_type == "EXTRATO":
            match = re.search(r"CRÉDITO\s*-\s*EMPRÉSTIMO CONSIGNADO\s+Contr\.\s*\d+\s+\+([\d.,]+)", page.text)
            if match:
                facts.append(ExtractedFact(
                    field="loan_amount", value=match.group(1).replace(".", "").replace(",", "."),
                    source=reference(document, page.number, match.group(0)),
                ))
    return facts


def check_documents(contents: list[DocumentContent]) -> list[DocumentCheck]:
    checks = []
    for field, label in [("cpf", "CPF"), ("claimant_name", "Titular identificado"),
                         ("contract_number", "Número do contrato"), ("loan_amount", "Valor liberado")]:
        facts = [f for content in contents for f in content.facts if f.field == field]
        values = {f.value.upper() for f in facts}
        document_count = len({f.source.document_id for f in facts})
        status = "divergent" if len(values) > 1 else "consistent" if document_count > 1 else "not_verified"
        checks.append(DocumentCheck(
            code=f"COMPARE_{field.upper()}", status=status,
            message=f"{label}: {len(values)} valor(es) extraído(s) de {document_count} documento(s). A comparação textual não autentica documentos.",
            sources=[f.source for f in facts],
        ))
    kinds = {c.document.document_type for c in contents}
    for kind in ["CONTRATO", "EXTRATO", "DOSSIE"]:
        if kind not in kinds:
            checks.append(DocumentCheck(code=f"MISSING_{kind}", status="not_verified",
                message=f"{kind} não consta entre os PDFs fornecidos para este caso.", sources=[]))
    receipts = [c for c in contents if c.document.document_type == "COMPROVANTE_CREDITO"]
    for content in contents:
        for page in content.pages:
            if content.document.document_type == "AUTOS" and re.search(r"não possui conta corrente", page.text, re.I):
                start = page.text.lower().index("não possui conta corrente")
                sources = [reference(content.document, page.number, page.text[max(0, start-250):start+600])]
                if receipts:
                    sources.append(reference(receipts[0].document, 1, receipts[0].pages[0].text[-1400:]))
                checks.append(DocumentCheck(code="CONTESTED_ACCOUNT_OWNERSHIP", status="divergent",
                    message="A inicial contesta a titularidade da conta indicada pelo banco. A alegação exige verificação independente.", sources=sources))
            if re.search(r"não foi localizado[\s\S]{0,160}vídeo de liveness", page.text, re.I):
                match = re.search(r"não foi localizado[\s\S]{0,400}", page.text, re.I)
                checks.append(DocumentCheck(code="MISSING_LIVENESS_RECORD", status="not_verified",
                    message="O laudo do banco informa que o vídeo de liveness não foi localizado.",
                    sources=[reference(content.document, page.number, match.group(0))]))
    return checks


@dataclass
class DocumentRecord:
    case_id: int
    content: DocumentContent
    pdf: bytes


class DocumentService:
    def __init__(self):
        self.records: dict[str, DocumentRecord] = {}

    def load_cases(self, root: Path) -> list[CaseDetail]:
        cases = []
        for case_id, filename in ARCHIVES.items():
            contents = []
            with ZipFile(root / filename) as archive:
                members = sorted((m for m in archive.infolist() if m.filename.lower().endswith(".pdf")), key=lambda m: m.filename)
                if not members or len(members) > 30:
                    raise ValueError(f"Quantidade inesperada de documentos em {filename}.")
                for index, member in enumerate(members, 1):
                    if member.file_size > 20 * 1024 * 1024:
                        raise ValueError("PDF excede o limite de 20 MB.")
                    pdf = archive.read(member)
                    reader = PdfReader(BytesIO(pdf))
                    if len(reader.pages) > 100:
                        raise ValueError("PDF excede o limite de 100 páginas.")
                    pages = [DocumentPage(number=n, text=p.extract_text() or "") for n, p in enumerate(reader.pages, 1)]
                    name = Path(member.filename).name
                    kind = next((value for key, value in KINDS.items() if key in name), "OUTRO")
                    document_id = f"c{case_id}-d{index:02d}"
                    document = CaseDocument(
                        id=document_id, name=name, category="AUTOS" if kind == "AUTOS" else "SUBSIDIO",
                        document_type=kind, text_excerpt=pages[0].text[:600] if pages else None,
                        download_url=f"/api/cases/{case_id}/documents/{document_id}/download",
                        page_count=len(pages), sha256=hashlib.sha256(pdf).hexdigest(),
                        extraction_status="ok" if all(p.text.strip() for p in pages) else "partial",
                    )
                    content = DocumentContent(document=document, pages=pages, facts=extract_facts(document, pages))
                    contents.append(content)
                    self.records[document_id] = DocumentRecord(case_id, content, pdf)
            autos = next(c for c in contents if c.document.document_type == "AUTOS")
            text = "\n".join(p.text for p in autos.pages)
            case_number = re.search(r"\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}", text).group()
            uf = {"10": "MA", "04": "AM"}[case_number.split(".")[3]]
            claimant = next(f.value for f in autos.facts if f.field == "claimant_name")
            cause_value = float(next(f.value for f in autos.facts if f.field == "cause_value"))
            defendant = re.search(r"em face de\s+([^,]+)", text, re.I).group(1).strip()
            court = re.search(r" - (.*?) - Página", text).group(1)
            kinds = {c.document.document_type for c in contents}
            clean_text = re.sub(r"^Processo nº .*?Página \d+\s*$", "", text, flags=re.M)
            fact_section = re.split(r"I\s*[–-]\s*DOS FATOS", clean_text, maxsplit=1)[-1]
            fact_section = re.split(r"II\s*[–-]\s*DO DIREITO", fact_section, maxsplit=1)[0]
            excerpt = " ".join(fact_section.split())[:1500]
            sentence_end = excerpt.rfind(". ")
            if sentence_end > 0:
                excerpt = excerpt[:sentence_end+1]
            cases.append(CaseDetail(
                id=case_id, case_number=case_number, title=f"{claimant} x {defendant}",
                uf=uf, sub_issue="Contratação contestada", cause_value=cause_value,
                status="PENDENTE", claimant_name=claimant, defendant_name=defendant, court=court,
                subsidies=SubsidyPresence(**{flag: kind in kinds for flag, kind in FLAGS.items()}),
                claims=["Conforme relato da parte autora na petição inicial: " + excerpt], documents=[c.document for c in contents],
                facts=[f for c in contents for f in c.facts], checks=check_documents(contents),
                data_mode="artifacts", is_simulated=True,
            ))
        return cases

    def get(self, case_id: int, document_id: str) -> DocumentRecord | None:
        record = self.records.get(document_id)
        return record if record is not None and record.case_id == case_id else None

    def sources(self, case_id: int) -> list[SourceReference]:
        return [reference(r.content.document, p.number, p.text)
                for r in self.records.values() if r.case_id == case_id
                for p in r.content.pages if p.text.strip()]
