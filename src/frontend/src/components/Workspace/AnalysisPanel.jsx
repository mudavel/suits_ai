import { useAction } from '../../hooks/useRemote'
import { analyzeCase } from '../../services/api'
import { currentAnalysis, money, policyScore } from '../../services/workflow'
import { Busy, ErrorNotice, Mode, Sources, Warnings } from './Shared'

export default function AnalysisPanel({ caseData, envelope, refresh, disabled }) {
  const operation = useAction()
  const analysis = envelope.analysis
  const current = currentAnalysis(envelope, caseData)
  const policy = current?.policy
  const score = policyScore(policy)
  return <section className="panel space-y-5">
    <div className="section-heading"><div><p className="eyebrow">PARECER E POLÍTICA</p><h2>Análise do caso</h2></div><button type="button" className="button-primary" disabled={disabled || operation.pending || caseData.status === 'CONCLUIDO'} onClick={() => operation.run(() => analyzeCase(caseData.id), refresh)}>{analysis ? 'Atualizar análise' : 'Analisar caso'}</button></div>
    {operation.pending && <Busy>Preparando o parecer. A geração pode levar alguns minutos...</Busy>}
    <ErrorNotice error={operation.error} />
    {analysis ? <>
      {!current && <p className="notice">Parecer histórico da versão {analysis.case_version}. Não define a recomendação nem a alçada da versão atual ({caseData.version}).</p>}
      <Mode value={analysis.generation_mode} />
      <p className="response-text">{analysis.explanation}</p>
      <Warnings items={analysis.warnings} />
      <Sources caseId={caseData.id} items={analysis.sources} />
      {policy ? <div className="grid sm:grid-cols-2 gap-5 border-t border-line pt-5">
        <div><p className="field-label">Recomendação atual</p><strong>{policy.recommendation === 'ACORDO' ? 'Acordo' : 'Defesa'}</strong><p className="text-xs text-muted mt-2">Risco: {policy.risk_level} · {policy.reasoning_code}</p></div>
        {score && <div><p className="field-label">{score.label}</p><strong>{(score.value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</strong></div>}
        {policy.settlement_pricing && <dl className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">{[['Piso', policy.settlement_pricing.floor], ['Alvo', policy.settlement_pricing.target], ['Teto', policy.settlement_pricing.ceiling], ['Perda esperada', policy.settlement_pricing.expected_loss]].map(([label, value]) => <div key={label}><dt className="field-label">{label}</dt><dd className="text-sm">{money(value)}</dd></div>)}</dl>}
        {!!policy.applied_rules?.length && <div className="sm:col-span-2 text-xs text-muted"><p className="field-label">Regras aplicadas</p><ul className="list-disc pl-4 space-y-1">{policy.applied_rules.map((rule, i) => <li key={i}>{rule}</li>)}</ul></div>}
      </div> : <p className="text-xs text-muted border-t border-line pt-4">Sem política atual disponível. Recomendação, probabilidade e faixa de acordo não foram estimadas pela interface.</p>}
    </> : <p className="text-sm text-muted leading-relaxed">Ainda não há parecer salvo. Use “Analisar caso” para revisar os documentos e consultar a política disponível.</p>}
    {!!caseData.checks.length && <details className="sources"><summary>Verificações documentais ({caseData.checks.length})</summary><div className="space-y-4 mt-4">{caseData.checks.map((check, i) => <article key={check.code + i}><p className="field-label">{{ consistent: 'Concordância textual', divergent: 'Divergência', not_verified: 'Não verificado' }[check.status]}</p><p className="text-xs leading-relaxed">{check.message}</p><Sources caseId={caseData.id} items={check.sources} /></article>)}</div></details>}
  </section>
}
