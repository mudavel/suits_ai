import { useCallback, useRef, useState } from 'react'
import { fetchDecisions, negotiate, recordDecision } from '../../services/api'
import { currentAnalysis, dateTime, decisionAttempt, money, parseAmount, requiresOverride } from '../../services/workflow'
import { useAuth } from '../../context/AuthContext'
import { useAction, useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, OffsetPager } from './Shared'

function readAttempt(caseId) {
  try { return JSON.parse(sessionStorage.getItem('suits-decision-' + caseId)) } catch { return null }
}
function saveAttempt(caseId, value) {
  try {
    if (value) sessionStorage.setItem('suits-decision-' + caseId, JSON.stringify(value))
    else sessionStorage.removeItem('suits-decision-' + caseId)
  } catch { /* The in-memory attempt remains available if storage is blocked. */ }
}

export default function DecisionPanel({ caseData, envelope, refresh, disabled }) {
  const { currentProfile } = useAuth()
  const [offset, setOffset] = useState(0)
  const records = useRemote(useCallback(signal => fetchDecisions(caseData.id, offset, { signal }), [caseData.id, offset]))
  return <section className="panel space-y-5">
    <div className="section-heading"><div><p className="eyebrow">REGISTRO DO ADVOGADO</p><h2>Decisão do caso</h2></div><button type="button" className="button-secondary" onClick={records.reload} disabled={records.loading}>Atualizar registros</button></div>
    {caseData.status === 'CONCLUIDO' ? <p className="notice notice-success">Processo concluído. A decisão registrada está preservada no histórico.</p> : currentProfile.id === 'LAWYER' ? <DecisionForm key={caseData.version} caseData={caseData} envelope={envelope} refresh={refresh} disabled={disabled} onSaved={() => { records.reload(); refresh() }} /> : <p className="text-xs text-muted">O registro da decisão está disponível no perfil Advogado.</p>}
    <ErrorNotice error={records.error} retry={records.reload} />
    {records.loading ? <Busy>Buscando decisões...</Busy> : <div className="space-y-3">{records.data?.items.map(record => <article key={record.decision.decision_id} className="bg-surface rounded-lg p-4 space-y-2"><p className="text-sm font-semibold">{record.decision.action === 'ACORDO' ? 'Acordo · ' + money(record.decision.settlement_amount) : 'Defesa'}</p><p className="text-xs text-muted">{dateTime(record.decision.created_at)} · {record.registration.lawyer_id} · {record.registration.law_firm_id}</p><p className="text-xs">{record.decision.is_override === null ? 'Registro manual sem política disponível.' : record.decision.is_override ? 'Decisão com divergência da política.' : 'Decisão aderente à política registrada.'}</p>{record.registration.override_reason && <p className="response-text">Justificativa: {record.registration.override_reason}</p>}</article>)}{!records.data?.items.length && <p className="text-xs text-muted">Nenhuma decisão registrada.</p>}</div>}
    <OffsetPager page={records.data} offset={offset} setOffset={setOffset} disabled={records.loading} />
  </section>
}

function DecisionForm({ caseData, envelope, refresh, disabled, onSaved }) {
  const [initialAttempt] = useState(() => readAttempt(caseData.id))
  const attempt = useRef(initialAttempt)
  const saved = initialAttempt?.body
  const [action, setAction] = useState(saved?.action || 'DEFESA')
  const [amount, setAmount] = useState(saved?.settlement_amount?.toString() || '')
  const [lawyer, setLawyer] = useState(saved?.lawyer_id || '')
  const [firm, setFirm] = useState(saved?.law_firm_id || '')
  const [reason, setReason] = useState(saved?.override_reason || '')
  const [review, setReview] = useState(null)
  const [blocked, setBlocked] = useState(false)
  const [completed, setCompleted] = useState(null)
  const [comparison, setComparison] = useState(null)
  const operation = useAction()
  const evaluation = useAction()
  const analysis = currentAnalysis(envelope, caseData)
  const stale = envelope.analysis && !analysis
  const override = requiresOverride(analysis?.policy, action, Number(amount.replace(',', '.')))
  const busy = operation.pending || evaluation.pending || disabled || stale
  const prepare = event => {
    event.preventDefault()
    operation.run(async () => {
      const value = action === 'ACORDO' ? parseAmount(amount) : null
      if (!lawyer.trim() || !firm.trim()) throw new Error('Informe os identificadores do advogado e do escritório.')
      if ((requiresOverride(analysis?.policy, action, value) || reason.trim()) && reason.trim().length < 5) throw new Error('A justificativa deve ter pelo menos 5 caracteres.')
      return { case_id: caseData.id, action, settlement_amount: value, lawyer_id: lawyer.trim(), law_firm_id: firm.trim(), expected_case_version: caseData.version, analysis_id: analysis?.analysis_id || null, override_reason: reason.trim() || null }
    }, setReview)
  }
  const confirm = () => operation.run(async () => {
    attempt.current = decisionAttempt(attempt.current, review)
    saveAttempt(caseData.id, attempt.current)
    try { return await recordDecision(attempt.current.body) } catch (error) { if (error.status === 409) setBlocked(true); throw error }
  }, result => {
    saveAttempt(caseData.id, null)
    setCompleted(result)
    onSaved()
  })
  if (completed) return <p role="status" className="notice notice-success">Decisão registrada. Processo concluído.</p>
  return <div className="space-y-4">
    {stale && <p className="notice">Atualize a análise do caso antes de registrar uma decisão. O parecer salvo é de outra versão.</p>}
    {!analysis?.policy && <p className="notice">Não há política atual disponível. O registro será identificado como decisão manual.</p>}
    {blocked && <p className="notice notice-error">Os dados mudaram ou já existe uma decisão. <button type="button" className="underline" onClick={() => { setBlocked(false); setReview(null); operation.clearError(); refresh() }}>Recarregar o processo</button> antes de continuar.</p>}
    <ErrorNotice error={operation.error} />
    {review ? <div className="space-y-4">
      <h3 className="text-sm font-semibold">Revise antes de concluir</h3>
      <dl className="review-list"><dt>Processo</dt><dd>{caseData.caseNumber}</dd><dt>Decisão</dt><dd>{review.action}{review.settlement_amount != null ? ' · ' + money(review.settlement_amount) : ''}</dd><dt>Advogado</dt><dd>{review.lawyer_id}</dd><dt>Escritório</dt><dd>{review.law_firm_id}</dd><dt>Justificativa</dt><dd>{review.override_reason || 'Não informada'}</dd><dt>Parecer</dt><dd>{review.analysis_id ? 'Parecer salvo da versão ' + review.expected_case_version : 'Sem parecer atual'}</dd></dl>
      <p className="text-xs text-muted">A confirmação registra a decisão e conclui o processo. O registro não pode ser substituído pela interface.</p>
      <div className="flex flex-wrap gap-3"><button type="button" className="button-primary" disabled={busy || blocked} onClick={confirm}>Confirmar e concluir processo</button><button type="button" className="button-secondary" disabled={busy} onClick={() => setReview(null)}>Editar decisão</button></div>
    </div> : <form onSubmit={prepare} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3"><label><span className="field-label">Decisão</span><select className="field" aria-label="Decisão" value={action} onChange={event => { setAction(event.target.value); setComparison(null) }} disabled={busy || blocked}><option value="DEFESA">Defesa</option><option value="ACORDO">Acordo</option></select></label>
      {action === 'ACORDO' && <label><span className="field-label">Valor a registrar (R$)</span><input className="field" aria-label="Valor a registrar" inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); setComparison(null) }} placeholder="2500,00" required disabled={busy || blocked} /></label>}
      <label><span className="field-label">Identificador do advogado</span><input className="field" value={lawyer} onChange={event => setLawyer(event.target.value)} maxLength={100} required disabled={busy || blocked} /></label><label><span className="field-label">Identificador do escritório</span><input className="field" value={firm} onChange={event => setFirm(event.target.value)} maxLength={100} required disabled={busy || blocked} /></label></div>
      {action === 'ACORDO' && <><button type="button" className="button-secondary" disabled={busy || blocked || !amount.trim()} onClick={() => evaluation.run(() => negotiate(caseData.id, parseAmount(amount)), setComparison)}>Consultar faixa de negociação</button><ErrorNotice error={evaluation.error} />{comparison && <p role="status" className="notice">{comparison.explanation} {comparison.requires_approval ? 'Requer aprovação.' : 'Dentro do teto registrado.'}</p>}</>}
      <label className="block"><span className="field-label">Justificativa {override ? '(obrigatória para divergir da política)' : '(opcional)'}</span><textarea className="field" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={2000} required={override} disabled={busy || blocked} /></label>
      <button className="button-primary" disabled={busy || blocked}>Revisar decisão</button>
    </form>}
    {operation.pending && <Busy>Processando decisão...</Busy>}{evaluation.pending && <Busy>Consultando a faixa...</Busy>}
  </div>
}
