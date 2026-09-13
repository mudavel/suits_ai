import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useAction } from '../../hooks/useRemote'
import { currentAnalysis, currentStrategy, dateTime, money, parseAmount, requiresOverride } from '../../services/workflow'
import { ErrorNotice } from './Shared'
import LawyerAccess from './LawyerAccess'

export default function StrategyPanel({ caseData, envelope, strategyEnvelope, refresh, disabled, generationBlocked, onGenerate, hasDraft, onNavigate }) {
  const { currentProfile } = useAuth()
  const analysis = currentAnalysis(envelope, caseData)
  const current = currentStrategy(strategyEnvelope, caseData, analysis)
  const saved = strategyEnvelope?.strategy
  const [editing, setEditing] = useState(false)
  const [action, setAction] = useState(saved?.action || analysis?.policy?.recommendation || 'DEFESA')
  const [amount, setAmount] = useState(saved?.settlement_amount?.toString() || '')
  const [rationale, setRationale] = useState(saved?.rationale || '')
  const operation = useAction()
  const busy = disabled || operation.pending
  const pricing = analysis?.policy?.settlement_pricing
  const override = requiresOverride(analysis?.policy, action, Number(amount.replace(',', '.')))
  const submit = event => {
    event.preventDefault()
    operation.run(() => onGenerate({ case_id: caseData.id, analysis_id: analysis.analysis_id,
      expected_case_version: caseData.version, action, settlement_amount: action === 'ACORDO' ? parseAmount(amount) : null,
      rationale: rationale.trim() || null }))
  }
  return <section id="strategy-panel" className="space-y-5" aria-label="Encaminhamento">
    {caseData.status === 'CONCLUIDO' ? <><p className="notice notice-success">A análise já tem uma decisão registrada.</p><button type="button" className="button-secondary" onClick={() => onNavigate('conclusao')}>Consultar conclusão</button></> : !analysis ? <><p className="notice">Prepare um parecer atual para fundamentar o encaminhamento.</p><button type="button" className="button-primary" onClick={() => onNavigate('parecer')}>Ir ao parecer</button></> : <>
      <p className="text-xs text-muted">{analysis.created_at ? 'Base: parecer de ' + dateTime(analysis.created_at) + '.' : 'Base: parecer salvo deste processo.'} {analysis.policy ? 'Recomendação: ' + (analysis.policy.recommendation === 'ACORDO' ? 'acordo.' : 'defesa.') : 'Sem recomendação automática; a escolha é do advogado.'}</p>
      <LawyerAccess purpose="definir ou revisar o encaminhamento" disabled={busy} />
      {pricing && <div className="pricing-card"><p className="field-label">Faixa de negociação do acordo</p><dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Piso', pricing.floor], ['Alvo', pricing.target], ['Teto', pricing.ceiling], ['Perda esperada', pricing.expected_loss]].map(([label, value]) => <div key={label}><dt className="field-label">{label}</dt><dd className="text-sm font-medium">{money(value)}</dd></div>)}</dl><details className="sources"><summary>Entenda a origem dos valores</summary><dl className="pricing-explanation"><div><dt>Piso</dt><dd>Valor inicial de negociação, calculado em 60% do alvo para preservar margem de composição.</dd></div><div><dt>Alvo</dt><dd>Valor pretendido para o acordo: cerca de 55% da perda esperada, buscando economia de 45%.</dd></div><div><dt>Teto</dt><dd>Maior valor autorizado sem aprovação adicional: considera 85% da perda esperada e o limite de 80% do valor da causa.</dd></div><div><dt>Perda esperada</dt><dd>Custo provável de continuar o processo: probabilidade de derrota multiplicada pela condenação estimada, incluindo danos, custas e honorários.</dd></div></dl></details></div>}
      {strategyEnvelope?.status === 'stale' && <p className="notice">O parecer ou o processo mudou. Revise o encaminhamento abaixo e gere uma nova minuta.</p>}
      {current && !editing ? <div className="space-y-4">
        <h3 className="text-sm font-semibold">{current.action === 'ACORDO' ? 'Acordo · ' + money(current.settlement_amount) : 'Defesa'}</h3>
        {current.rationale && <p className="response-text">{current.rationale}</p>}
        <p className="text-xs text-muted">Encaminhamento salvo em {dateTime(current.created_at)}. Após revisar a minuta, registre a conclusão na aba seguinte.</p>
        {currentProfile.id === 'LAWYER' && <div className="flex flex-wrap gap-3"><button type="button" className="button-primary" disabled={busy || generationBlocked} onClick={() => onGenerate()}>{hasDraft ? 'Gerar outra minuta' : 'Gerar minuta'}</button><button type="button" className="button-secondary" disabled={busy} onClick={() => setEditing(true)}>Revisar encaminhamento</button></div>}
      </div> : currentProfile.id === 'LAWYER' ? <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3"><label><span className="field-label">Encaminhamento</span><select className="field" value={action} onChange={event => setAction(event.target.value)} disabled={busy}><option value="DEFESA">Preparar defesa</option><option value="ACORDO">Propor acordo</option></select></label>
          {action === 'ACORDO' && <label><span className="field-label">Valor proposto (R$)</span><input className="field" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} required disabled={busy} placeholder="2500,00" /></label>}
        </div>
        <label className="block"><span className="field-label">Orientação para a minuta {override ? '(justificativa obrigatória para divergência)' : '(opcional)'}</span><textarea className="field" value={rationale} onChange={event => setRationale(event.target.value)} minLength={5} maxLength={2000} required={override} disabled={busy} placeholder="Indique os pontos que a minuta deve desenvolver." /></label>
        <p className="text-xs text-muted">Ao gerar a minuta, o encaminhamento é salvo automaticamente. Você poderá revisar o documento antes de concluir a análise.</p>
        <div className="flex flex-wrap gap-3"><button className="button-primary" disabled={busy || generationBlocked}>Gerar minuta</button>{current && <button type="button" className="button-secondary" disabled={busy} onClick={() => setEditing(false)}>Cancelar edição</button>}</div>
      </form> : null}
    </>}
    <ErrorNotice error={operation.error} retry={operation.error?.status === 409 ? refresh : undefined} />
  </section>
}
