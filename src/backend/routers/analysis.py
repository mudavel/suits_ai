from fastapi import APIRouter

from src.backend.dependencies import Analysis, Cases, require_case
from src.backend.schemas import AnalyzeRequest, AnalyzeResponse, ErrorResponse

router = APIRouter(prefix="/api", tags=["Análise"])


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={404: {"model": ErrorResponse, "description": "Caso não encontrado"}},
    summary="Analisar documentos e consultar a política disponível",
    description="Persiste o parecer com suas fontes. policy=null enquanto o motor da branch 1 não estiver integrado.",
)
async def analyze_case(
    payload: AnalyzeRequest, cases: Cases, analysis: Analysis
) -> AnalyzeResponse:
    case = await require_case(payload.case_id, cases)
    return await analysis.analyze(case)
