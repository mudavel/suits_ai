import { useState } from 'react'
import { useAction } from '../../hooks/useRemote'
import { prepareDraft } from '../../services/draftWorkflow'
import { currentAnalysis, currentStrategy } from '../../services/workflow'
import { Busy, ErrorNotice } from './Shared'
import StrategyPanel from './StrategyPanel'
import DraftsPanel from './DraftsPanel'

export default function PreparationPanel({ caseData, envelope, strategyEnvelope, refresh, disabled, onNavigate, draftState, onDraftStateChange }) {
  const operation = useAction()
  const [phase, setPhase] = useState(null)
  const [generatedDraft, setGeneratedDraft] = useState(null)
  const [draftBusy, setDraftBusy] = useState(false)
  const analysis = currentAnalysis(envelope, caseData)
  const strategy = currentStrategy(strategyEnvelope, caseData, analysis)
  const dirty = Boolean(draftState.draft && draftState.content !== draftState.draft.content_markdown)
  const generate = request => {
    if (disabled || operation.pending || draftBusy || dirty || !analysis || caseData.status === 'CONCLUIDO') return
    operation.run(() => prepareDraft({ request, strategy, onPhase: setPhase }), setGeneratedDraft)
      .finally(refresh)
  }
  return <section className="panel space-y-6" aria-labelledby="strategy-draft-heading">
    <div className="section-heading"><div><p className="eyebrow">ETAPA 2</p><h2 id="strategy-draft-heading">Encaminhamento e minuta</h2><p className="text-xs text-muted mt-2">Escolha o encaminhamento e clique em Gerar minuta. A minuta é o documento em preparação, que você pode revisar e exportar em PDF.</p></div></div>
    <StrategyPanel key={caseData.version + ':' + envelope.analysis?.analysis_id + ':' + strategyEnvelope?.strategy?.strategy_id}
      caseData={caseData} envelope={envelope} strategyEnvelope={strategyEnvelope} refresh={refresh}
      disabled={disabled || operation.pending || draftBusy} generationBlocked={dirty}
      onGenerate={generate} hasDraft={Boolean(draftState.draft)} onNavigate={onNavigate} />
    {dirty && <p className="notice">Há alterações no texto da minuta. Conclua a revisão ou descarte essas edições antes de gerar outra minuta.</p>}
    {operation.pending && <Busy>{phase === 'saving' ? 'Salvando o encaminhamento e preparando a minuta...' : 'Gerando a minuta. Isso pode levar alguns minutos...'}</Busy>}
    <ErrorNotice error={operation.error} retry={operation.error?.status === 409 ? refresh : undefined} />
    <DraftsPanel key={generatedDraft?.draft_id || 'saved-drafts'} caseData={caseData} envelope={envelope} strategyEnvelope={strategyEnvelope} refresh={refresh}
      disabled={disabled || operation.pending} generatedDraft={generatedDraft} onBusy={setDraftBusy} onDraftStateChange={onDraftStateChange} />
  </section>
}
