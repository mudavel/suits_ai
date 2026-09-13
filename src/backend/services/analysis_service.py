import importlib

from fastapi import HTTPException
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from src.backend.schemas import AnalyzeResponse, CaseDetail, NegotiationResponse, PolicyResult, ScenarioArgument
from src.backend.services.copilot import Copilot, AssessmentText
from src.backend.services.mocks import MockAnalysisService
from src.backend.services.policy_adapter import policy_input


class AnalysisService:
    def __init__(self, settings, store, copilot: Copilot):
        self.settings, self.store, self.copilot = settings, store, copilot

    async def analyze(self, case: CaseDetail) -> AnalyzeResponse:
        if case.data_mode == "mock" and self.settings.policy_mode == "mock":
            result = await MockAnalysisService().analyze(case)
            result.case_version = case.version
            return await self.store.save_analysis(result)
        policy, policy_status = None, "unavailable"
        warnings = []
        if self.settings.policy_mode == "engine":
            data, input_warnings = policy_input(case)
            warnings.extend(input_warnings)
            try:
                engine = importlib.import_module("src.policy.engine")
                raw = await run_in_threadpool(engine.evaluate_case, data)
                policy = PolicyResult.model_validate(raw.model_dump() if hasattr(raw, "model_dump") else raw)
                policy_status = "available"
                if policy.confidence_score_semantics == "unspecified":
                    warnings.append("B1 não declara a semântica de confidence_score; não apresentar como probabilidade de derrota.")
            except (ImportError, AttributeError, ValidationError, ValueError, TypeError, OSError, RuntimeError) as error:
                raise HTTPException(503, "Motor da branch 1 indisponível ou incompatível com o contrato.") from error
        else:
            warnings.append("Motor da branch 1 ainda não integrado: probabilidade, recomendação e alçada indisponíveis.")
        sources = self.copilot.context(case, "petição inicial pedidos fatos contrato extrato titularidade crédito descontos", limit=10)
        explanation = policy.plain_language_explanation if policy and policy.plain_language_explanation else "Revisão documental local. " + " ".join(check.message for check in case.checks)
        author, defense = [], []
        if self.settings.ai_mode == "openai":
            generated = await self.copilot.generate(AssessmentText,
                "Produza uma avaliação interna única para orientar o encaminhamento e a futura peça. "
                "O parecer deve ser um RESUMO TEXTUAL DO PROCESSO, em 3 ou 4 parágrafos corridos, de aproximadamente 180 a 260 palavras, "
                "sem títulos, listas ou divisão em controvérsias, elementos disponíveis e pendências. "
                "Apresente primeiro as partes, o objeto da ação, os fatos centrais e os pedidos efetivamente identificados na inicial; "
                "inclua órgão julgador, valor da causa e condições da operação quando relevantes e disponíveis. "
                "Depois sintetize a versão da parte autora e o que os documentos do banco registram sobre contratação, crédito e descontos. "
                "Diferencie alegações, registros documentais e fatos que ainda não puderam ser confirmados. "
                "Finalize com o ponto central que exige esclarecimento, se houver, sem transformar o parecer numa lista de problemas. "
                "Não invente pedidos, datas, valores, autenticidade ou fase processual. Não confunda valor da causa com valor contratado. "
                "Nunca exponha contagens de valores extraídos, comparação textual, campos, indicadores ou procedimentos técnicos. "
                "Cite de forma breve documento e página junto dos fatos materiais; não repita avisos genéricos. "
                "Não reproduza a fundamentação da política, probabilidades ou recomendações: elas têm seção própria. "
                "Nos campos de argumentos, confronte as alegações "
                "do autor com possíveis respostas documentais do banco, citando as fontes. Não repita essa lista no texto de síntese. Não preveja julgamento.",
                case, sources, extra={"policy": policy.model_dump() if policy else None})
            explanation = generated.text
            author = [ScenarioArgument(text=argument.text, sources=self.copilot.cited(argument.source_ids, sources)) for argument in generated.author_arguments]
            defense = [ScenarioArgument(text=argument.text, sources=self.copilot.cited(argument.source_ids, sources)) for argument in generated.defense_arguments]
            all_ids = generated.source_ids + [source_id for argument in generated.author_arguments + generated.defense_arguments for source_id in argument.source_ids]
            sources = self.copilot.cited(all_ids, sources)
            warnings.extend(generated.warnings)
            warnings.extend(warning for argument in generated.author_arguments + generated.defense_arguments for warning in argument.warnings)
        else:
            comparison = await self.copilot.scenarios(case)
            author, defense = comparison.author_arguments, comparison.defense_arguments
        result = AnalyzeResponse(case_id=case.id, case_version=case.version, policy=policy,
            policy_status=policy_status, explanation=explanation, warnings=list(dict.fromkeys(warnings)),
            data_mode=case.data_mode, generation_mode=self.settings.ai_mode,
            sources=sources, document_checks=case.checks, author_arguments=author, defense_arguments=defense)
        return await self.store.save_analysis(result)

    async def negotiate(self, case: CaseDetail, proposed_amount: float) -> NegotiationResponse:
        analysis = await self.store.latest_analysis(case.id)
        policy = analysis.policy if analysis and analysis.case_version == case.version else None
        pricing = policy.settlement_pricing if policy else None
        if pricing is None:
            return NegotiationResponse(case_id=case.id, proposed_amount=proposed_amount,
                status="SEM_FAIXA" if policy else "SEM_POLITICA", within_ceiling=None,
                requires_approval=True, pricing=None,
                explanation="Não há faixa de negociação disponível em uma análise atual deste caso.")
        status = "ACIMA_TETO" if proposed_amount > pricing.ceiling else "ABAIXO_PISO" if proposed_amount < pricing.floor else "NA_FAIXA"
        return NegotiationResponse(case_id=case.id, proposed_amount=proposed_amount, status=status,
            within_ceiling=proposed_amount <= pricing.ceiling,
            requires_approval=proposed_amount > pricing.ceiling, pricing=pricing,
            explanation="Comparação com a faixa registrada na análise; não registra acordo nem aceite das partes.")
