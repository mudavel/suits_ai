from typing import Annotated
from urllib.parse import quote
from uuid import UUID

from fastapi import APIRouter, Path, Query, Request, Response, HTTPException
from starlette.concurrency import run_in_threadpool

from src.backend.dependencies import Analysis, Cases, require_case
from src.backend.schemas import (
    AnalyzeRequest, CaseCreateRequest, CaseDetail, ChatHistoryResponse, ChatRequest, ChatResponse, ChatSessionListResponse,
    DecisionListResponse, DecisionRequest, DecisionResponse, DocumentContent, DraftRequest, DraftResponse,
    DraftListResponse, ExportRequest, NegotiationRequest, NegotiationResponse, ScenariosResponse, StoredAnalysisResponse,
)

router = APIRouter(prefix="/api")
PositiveId = Annotated[int, Path(gt=0)]
PageLimit = Annotated[int, Query(ge=1, le=100)]
PageOffset = Annotated[int, Query(ge=0)]


@router.get("/cases/{case_id}/analysis", response_model=StoredAnalysisResponse, tags=["Análise"],
    summary="Recuperar o último parecer sem executar nova análise")
async def stored_analysis(case_id: PositiveId, request: Request, cases: Cases):
    case = await require_case(case_id, cases)
    analysis = await request.app.state.store.latest_analysis(case_id)
    status = "not_found" if analysis is None else "available" if analysis.case_version == case.version else "stale"
    return StoredAnalysisResponse(case_id=case_id, case_version=case.version, status=status, analysis=analysis)


@router.get("/cases/{case_id}/chats", response_model=ChatSessionListResponse, tags=["Copiloto"],
    summary="Listar conversas salvas do caso")
async def chat_sessions(case_id: PositiveId, request: Request, cases: Cases, limit: PageLimit = 20, offset: PageOffset = 0):
    await require_case(case_id, cases)
    return await request.app.state.store.list_sessions(case_id, limit=limit, offset=offset)


@router.get("/cases/{case_id}/drafts", response_model=DraftListResponse, tags=["Minutas"],
    summary="Listar minutas salvas do caso")
async def saved_drafts(case_id: PositiveId, request: Request, cases: Cases, limit: PageLimit = 20, offset: PageOffset = 0):
    await require_case(case_id, cases)
    return await request.app.state.store.list_drafts(case_id, limit=limit, offset=offset)


@router.post("/cases", response_model=CaseDetail, status_code=201, tags=["Casos"])
async def create_case(payload: CaseCreateRequest, request: Request):
    return await request.app.state.store.create_case(payload)


@router.get("/cases/{case_id}/documents/{document_id}", response_model=DocumentContent, tags=["Documentos"])
async def document(case_id: PositiveId, document_id: str, request: Request):
    record = request.app.state.documents.get(case_id, document_id)
    if record is None:
        raise HTTPException(404, "Documento não encontrado neste caso.")
    return record.content


@router.get("/cases/{case_id}/documents/{document_id}/download", tags=["Documentos"],
    response_class=Response, responses={200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}}})
async def download(case_id: PositiveId, document_id: str, request: Request):
    record = request.app.state.documents.get(case_id, document_id)
    if record is None:
        raise HTTPException(404, "Documento não encontrado neste caso.")
    return Response(record.pdf, media_type="application/pdf", headers={
        "Content-Disposition": "inline; filename*=UTF-8''" + quote(record.content.document.name),
        "X-Content-Type-Options": "nosniff",
    })


@router.post("/chat", response_model=ChatResponse, tags=["Copiloto"])
async def chat(payload: ChatRequest, request: Request, cases: Cases):
    case = await require_case(payload.case_id, cases)
    return await request.app.state.copilot.chat(case, payload)


@router.get("/cases/{case_id}/chat/{session_id}", response_model=ChatHistoryResponse, tags=["Copiloto"])
async def history(case_id: PositiveId, session_id: UUID, request: Request, cases: Cases):
    await require_case(case_id, cases)
    return {"case_id": case_id, "session_id": session_id,
            "messages": await request.app.state.store.session_history(case_id, session_id)}


@router.post("/scenarios", response_model=ScenariosResponse, tags=["Copiloto"])
async def scenarios(payload: AnalyzeRequest, request: Request, cases: Cases):
    return await request.app.state.copilot.scenarios(await require_case(payload.case_id, cases))


@router.post("/generate-draft", response_model=DraftResponse, status_code=201, tags=["Minutas"])
async def generate_draft(payload: DraftRequest, request: Request, cases: Cases):
    return await request.app.state.copilot.draft(await require_case(payload.case_id, cases), payload)


@router.get("/drafts/{draft_id}", response_model=DraftResponse, tags=["Minutas"])
async def get_draft(draft_id: UUID, request: Request):
    return await request.app.state.store.get_draft(draft_id)


@router.post("/export-pdf", tags=["Minutas"], response_class=Response,
    responses={200: {"content": {
        "application/pdf": {"schema": {"type": "string", "format": "binary"}},
        "text/html": {"schema": {"type": "string"}},
    }}})
async def export(payload: ExportRequest, request: Request):
    draft = await request.app.state.store.get_draft(payload.draft_id)
    content = payload.content_markdown if payload.content_markdown is not None else draft.content_markdown
    if payload.format == "html":
        return Response(request.app.state.pdf.html(draft, content), media_type="text/html", headers={
            "Content-Disposition": f'attachment; filename="minuta-{draft.draft_id}.html"',
            "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
        })
    binary, engine = await run_in_threadpool(request.app.state.pdf.render, draft, content)
    return Response(binary, media_type="application/pdf", headers={
        "Content-Disposition": f'attachment; filename="minuta-{draft.draft_id}.pdf"', "X-PDF-Engine": engine,
    })


@router.post("/negotiation-copilot", response_model=NegotiationResponse, tags=["Decisões"])
async def negotiation(payload: NegotiationRequest, analysis: Analysis, cases: Cases):
    return await analysis.negotiate(await require_case(payload.case_id, cases), payload.proposed_amount)


@router.post("/decisions", response_model=DecisionResponse, status_code=201, tags=["Decisões"])
async def record_decision(payload: DecisionRequest, request: Request):
    return await request.app.state.store.record_decision(payload)


@router.get("/decisions", response_model=DecisionListResponse, tags=["Decisões"])
async def decisions(request: Request, case_id: Annotated[int | None, Query(gt=0)] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 200, offset: Annotated[int, Query(ge=0)] = 0):
    return await request.app.state.store.decisions(case_id, limit=limit, offset=offset)
