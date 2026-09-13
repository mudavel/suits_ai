import logging
from zipfile import BadZipFile
from xml.etree.ElementTree import ParseError
from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter(prefix='/api/monitoring/historical', tags=['Monitoramento'])
logger = logging.getLogger(__name__)


@router.get('', summary='Consultar processos e subsídios da planilha histórica, com filtros e paginação')
def historical(request: Request, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100),
               q: str = Query('', max_length=200), uf: str = '', subject: str = '', sub_subject: str = '',
               macro_result: str = '', micro_result: str = '',
               subsidy: Literal['', 'contract', 'statement', 'credit_receipt', 'dossier', 'debt_evolution', 'referenced_report'] = '',
               presence: Literal['provided', 'missing'] = 'provided',
               sort: Literal['source_row', 'case_number', 'uf', 'subject', 'sub_subject', 'macro_result', 'micro_result',
                             'cause_value', 'condemnation_value', 'subsidy_count', 'contract', 'statement',
                             'credit_receipt', 'dossier', 'debt_evolution', 'referenced_report'] = 'source_row',
               direction: Literal['asc', 'desc'] = 'asc'):
    try:
        return request.app.state.historical.query(page=page, page_size=page_size, q=q, uf=uf, subject=subject,
            sub_subject=sub_subject, macro_result=macro_result, micro_result=micro_result,
            subsidy=subsidy, presence=presence, sort=sort, direction=direction)
    except (OSError, ValueError, KeyError, StopIteration, BadZipFile, ParseError):
        logger.exception('Não foi possível consultar a planilha histórica')
        raise HTTPException(503, 'Não foi possível carregar a planilha histórica. Verifique o arquivo de origem.') from None
