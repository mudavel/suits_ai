import importlib

from fastapi import HTTPException
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from src.backend.schemas import AnalyzeResponse, CaseDetail, NegotiationResponse, PolicyResult
from src.backend.services.copilot import Copilot, GroundedText
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
        sources = self.copilot.context(case, "contrato extrato liveness titularidade parecer crédito", limit=10)
        if policy and (policy.plain_language_explanation or policy.decision_path):
            explanation_parts = []
            if policy.plain_language_explanation:
                explanation_parts.append(policy.plain_language_explanation)
            if policy.decision_path:
                explanation_parts.append("### Trilha da Decisão (Tracing)\n" + "\n".join(f"- {step}" for step in policy.decision_path))
            if policy.forest_consensus_reasons:
                explanation_parts.append("### Fatores de Consenso do Modelo\n" + "\n".join(f"- {reason}" for reason in policy.forest_consensus_reasons))
            explanation = "\n\n".join(explanation_parts)
        else:
            explanation = "Revisão documental local. " + " ".join(check.message for check in case.checks)

        if self.settings.ai_mode == "openai":
            prompt = (
                "Produza um parecer documental detalhado e fundamentado. Utilize a política e o tracing do modelo "
                "fornecidos em extra.policy (incluindo a recomendação, o decision_path, as applied_rules e os "
                "forest_consensus_reasons) para sintetizar em texto jurídico fluido por que a recomendação é de acordo "
                "ou defesa e qual o racional da trilha percorrida pela inteligência. Sem política fornecida, limite-se "
                "à análise documental e não recomende acordo/defesa nem atribua probabilidade."
            )
            generated = await self.copilot.generate(GroundedText, prompt,
                case, sources, extra={"policy": policy.model_dump() if policy else None})
            explanation = generated.text
            sources = self.copilot.cited(generated.source_ids, sources)
            warnings.extend(generated.warnings)
        result = AnalyzeResponse(case_id=case.id, case_version=case.version, policy=policy,
            policy_status=policy_status, explanation=explanation, warnings=warnings,
            data_mode=case.data_mode, generation_mode=self.settings.ai_mode,
            sources=sources, document_checks=case.checks)
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
