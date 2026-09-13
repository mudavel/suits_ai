import MarkdownContent from '../MarkdownContent'
import { riskLabel, reasonLabel } from '../../services/productLanguage'
import { useAction } from '../../hooks/useRemote'
import { analyzeCase } from '../../services/api'
import { currentAnalysis, dateTime, money, policyScore } from '../../services/workflow'
import { Busy, ErrorNotice, Mode, Sources } from './Shared'
import { compactPolicyExplanation } from '../../services/policyExplanation'
import { caseAssessment } from '../../services/caseAssessment'

function ConciseAssessment({ caseData, analysis, current }) {
  const assessment = caseAssessment(caseData, analysis, current)
  return <div className="analysis-reading-width case-assessment">
    {assessment.generated && <Mode value={analysis.generation_mode} />}
    <MarkdownContent>{assessment.text}</MarkdownContent>
  </div>
}

function PolicyGuide({ analysis, historical }) {
  const explanation = compactPolicyExplanation(analysis)
  if (!explanation) return null
  return <details className="sources policy-guide"><summary>Como a política chega à definição</summary><div className="policy-rationale space-y-5 mt-4">
    <h3>{historical ? 'Recomendação registrada' : 'Recomendação'}: {explanation.recommendation}</h3>
    {historical && <p className="notice">Esta fundamentação pertence ao parecer anterior e não orienta uma nova decisão sem atualização da análise.</p>}
    {explanation.paragraphs.map((text, i) => <p key={i}>{text}</p>)}
    <p className="text-xs text-muted">{explanation.note}</p>
    {analysis.created_at && <p className="text-xs text-muted">Avaliação de {dateTime(analysis.created_at)}</p>}
  </div></details>
}

export default function AnalysisPanel({ caseData, envelope, refresh, disabled, onNavigate }) {
  const operation = useAction()
  const analysis = envelope.analysis
  const current = currentAnalysis(envelope, caseData)
  const policy = current?.policy
  const recordedPolicy = analysis?.policy
  const score = policyScore(policy)
  const closed = caseData.status === 'CONCLUIDO'
  const generate = () => operation.run(() => analyzeCase(caseData.id), refresh)
  const busy = disabled || operation.pending
  return <section className="panel space-y-6">
    <div className="section-heading"><div><p className="eyebrow">ETAPA 1</p><h2>Parecer do caso</h2><p className="text-xs text-muted mt-2">Resumo do processo, das alegações e dos documentos relevantes.</p></div>{closed ? <button type="button" className="button-secondary" onClick={() => onNavigate('conclusao')}>Consultar conclusão</button> : current ? <button type="button" className="button-primary" disabled={busy} onClick={() => onNavigate('encaminhamento')}>Definir encaminhamento</button> : <button type="button" className="button-primary" disabled={busy} onClick={generate}>{analysis ? 'Atualizar parecer desatualizado' : 'Gerar parecer'}</button>}</div>
    {operation.pending && <Busy>Preparando o parecer. Isso pode levar alguns minutos...</Busy>}
    <ErrorNotice error={operation.error} />
    {analysis ? <>
      {!current && <p className="notice">Parecer anterior, preservado para consulta. Ele não orienta a recomendação nem a alçada atuais deste processo.</p>}
      {policy && <div className="grid sm:grid-cols-3 gap-5 bg-surface rounded-lg p-5">
        <div><p className="field-label">Recomendação atual</p><strong>{policy.recommendation === 'ACORDO' ? 'Acordo' : 'Defesa'}</strong><p className="text-xs text-muted mt-2">Risco: {riskLabel(policy.risk_level)} · {reasonLabel(policy.reasoning_code)}</p></div>
        {score && <div><p className="field-label">{score.label}</p><strong>{(score.value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong></div>}
        {policy.settlement_pricing?.expected_loss != null && <div><p className="field-label">Perda esperada</p><strong>{money(policy.settlement_pricing.expected_loss)}</strong></div>}
      </div>}
      <ConciseAssessment caseData={caseData} analysis={analysis} current={Boolean(current)} />
      <div className="analysis-reading-width space-y-4"><Sources caseId={caseData.id} items={analysis.sources} />{recordedPolicy && <PolicyGuide analysis={analysis} historical={!current} />}</div>
      {current && !closed && <details className="sources"><summary>Versão e atualização do parecer</summary><div className="space-y-3 mt-3"><p>{analysis.created_at ? 'Gerado em ' + dateTime(analysis.created_at) + '.' : 'Parecer salvo antes do registro de data de geração.'} Uma nova geração substitui a base do encaminhamento e exige sua revisão.</p>{!analysis.author_arguments?.length && !analysis.defense_arguments?.length && <p>Este parecer anterior não inclui o confronto estruturado de argumentos. Uma nova geração inclui essa fundamentação.</p>}<button type="button" className="button-secondary" disabled={busy} onClick={generate}>Gerar nova versão do parecer</button></div></details>}
    </> : <p className="text-sm text-muted leading-relaxed">Ainda não há parecer salvo. Gere o parecer a partir dos documentos disponíveis neste processo.</p>}
  </section>
}
