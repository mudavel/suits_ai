from typing import Annotated

from fastapi import APIRouter, Path, Query

from backend.dependencies import Cases, require_case
from backend.schemas import CaseDetail, CaseListResponse, CaseStatus, ErrorResponse, UF

router = APIRouter(prefix="/api/cases", tags=["Casos"])


@router.get("", response_model=CaseListResponse, summary="Listar casos com filtros")
async def list_cases(
    cases: Cases,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: CaseStatus | None = None,
    uf: Annotated[UF | None, Query()] = None,
) -> CaseListResponse:
    return await cases.list_cases(page=page, page_size=page_size, status=status, uf=uf)


@router.get(
    "/{case_id}",
    response_model=CaseDetail,
    responses={404: {"model": ErrorResponse, "description": "Caso não encontrado"}},
    summary="Consultar autos e subsídios de um caso",
)
async def get_case(
    case_id: Annotated[int, Path(gt=0)], cases: Cases
) -> CaseDetail:
    return await require_case(case_id, cases)
