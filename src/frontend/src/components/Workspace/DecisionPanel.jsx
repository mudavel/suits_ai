import { useCallback, useRef, useState } from 'react'
import { fetchDecisions, recordDecision } from '../../services/api'
import { dateTime, decisionAttempt, money, draftMatchesStrategy } from '../../services/workflow'
import { useAuth } from '../../context/AuthContext'
import { useAction, useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, OffsetPager } from './Shared'

const LAWYERS = [
  { value: 'Dr. Lucas Ramos · OAB/SP 284.193', firm: 'Pinheiro & Associados Advogados' },
  { value: 'Dra. Juliana Mendes · OAB/MG 172.804', firm: 'Carvalho, Dias & Silva Advogados' },
  { value: 'Dr. Roberto Albuquerque · OAB/PE 41.620', firm: 'Albuquerque & Castro Sociedade' },
  { value: 'Dra. Fernanda Vasconcelos · OAB/RJ 231.057', firm: 'Vasconcelos Contencioso Bancário' },
  { value: 'Dr. Carlos Moreira · OAB/RS 96.411', firm: 'Moreira & Guimarães Consultoria' },
]

function readAttempt(caseId) {
  try { return JSON.parse(sessionStorage.getItem('suits-decision-' + caseId)) } catch { return null }
}
function saveAttempt(caseId, value) {
  try {
    if (value) sessionStorage.setItem('suits-decision-' + caseId, JSON.stringify(value))
    else sessionStorage.removeItem('suits-decision-' + caseId)
  } catch { /* In-memory retries remain available. */ }
}

export default function DecisionPanel({ caseData, strategy, draft, content, refresh, disabled }) {
  const { currentProfile } = useAuth()
  const [offset, setOffset] = useState(0)
  const records = useRemote(useCallback(signal => fetchDecisions(caseData.id, offset, { signal }), [caseData.id, offset]))
  const ready = draftMatchesStrategy(draft, strategy)
  return <section className="border-t border-line pt-6 space-y-5">
    <div className="section-heading"><div><p className="eyebrow">ETAPA 3</p><h2>{caseData.status === 'CONCLUIDO' ? 'Análise concluída' : 'Concluir análise'}</h2><p className="text-xs text-muted mt-2">Registre o encaminhamento junto da minuta revisada e dos responsáveis.</p></div><button type="button" className="button-secondary" onClick={records.reload} disabled={records.loading}>Atualizar registros</button></div>
    {caseData.status === 'CONCLUIDO' ? <p className="notice notice-success">Análise concluída. O registro preserva o parecer, o encaminhamento e, nas decisões deste fluxo, o texto revisado.</p> : currentProfile.id !== 'LAWYER' ? <p className="text-xs text-muted">O registro final está disponível no perfil Advogado.</p> : ready ? <DecisionForm key={caseData.version + ':' + draft.draft_id + ':' + strategy.strategy_id} caseData={caseData} strategy={strategy} draft={draft} content={content} disabled={disabled} refresh={refresh} onSaved={() => { records.reload(); refresh() }} /> : <p className="text-xs text-muted">Na aba “Encaminhamento e minuta”, abra uma minuta atual e revise o texto para habilitar a conclusão.</p>}
    <ErrorNotice error={records.error} retry={records.reload} />
    {records.loading ? <Busy>Buscando decisões...</Busy> : <div className="space-y-3">{records.data?.items.map(record => <article key={record.decision.decision_id} className="bg-surface rounded-lg p-4 space-y-2"><p className="text-sm font-semibold">{record.decision.action === 'ACORDO' ? 'Acordo · ' + money(record.decision.settlement_amount) : 'Defesa'}</p><p className="text-xs text-muted">{dateTime(record.decision.created_at)} · {record.registration.lawyer_id} · {record.registration.law_firm_id}</p><p className="text-xs">{record.decision.is_override === null ? 'Registro manual sem política disponível.' : record.decision.is_override ? 'Decisão com divergência da política.' : 'Decisão aderente à política registrada.'}</p>{record.registration.override_reason && <p className="response-text">Justificativa: {record.registration.override_reason}</p>}{record.registration.reviewed_content_markdown && <details className="sources"><summary>Texto revisado preservado no registro</summary><p className="response-text mt-3">{record.registration.reviewed_content_markdown}</p></details>}</article>)}{!records.data?.items.length && <p className="text-xs text-muted">Nenhuma decisão registrada.</p>}</div>}
    <OffsetPager page={records.data} offset={offset} setOffset={setOffset} disabled={records.loading} />
  </section>
}

function DecisionForm({ caseData, strategy, draft, content, disabled, refresh, onSaved }) {
  const [initialAttempt] = useState(() => readAttempt(caseData.id))
  const attempt = useRef(initialAttempt)
  const [lawyer, setLawyer] = useState(initialAttempt?.body?.lawyer_id || '')
  const [firm, setFirm] = useState(initialAttempt?.body?.law_firm_id || '')
  const [reviewedContent, setReviewedContent] = useState(null)
  const [review, setReview] = useState(null)
  const [blocked, setBlocked] = useState(false)
  const [completed, setCompleted] = useState(false)
  const operation = useAction()
  const busy = operation.pending || disabled
  const checked = reviewedContent === content
  const currentReview = review?.reviewed_content_markdown === content ? review : null
  const prepare = event => {
    event.preventDefault()
    if (!checked || !content.trim() || !lawyer.trim() || !firm.trim()) return
    setReview({ case_id: caseData.id, action: strategy.action, settlement_amount: strategy.settlement_amount,
      lawyer_id: lawyer.trim(), law_firm_id: firm.trim(), expected_case_version: caseData.version,
      analysis_id: strategy.analysis_id, override_reason: strategy.rationale, draft_id: draft.draft_id,
      reviewed_content_markdown: content })
  }
  const confirm = () => operation.run(async () => {
    if (!currentReview || !checked) throw new Error('Revise o texto atual antes de concluir.')
    attempt.current = decisionAttempt(attempt.current, currentReview)
    saveAttempt(caseData.id, attempt.current)
    try { return await recordDecision(attempt.current.body) } catch (error) { if (error.status === 409) setBlocked(true); throw error }
  }, () => {
    saveAttempt(caseData.id, null)
    setCompleted(true)
    onSaved()
  })
  if (completed) return <p role="status" className="notice notice-success">Decisão e texto revisado registrados. Análise concluída.</p>
  return <div className="space-y-4">
    {blocked && <p className="notice notice-error">O processo ou sua fundamentação mudou. <button type="button" className="underline" onClick={refresh}>Atualizar processo</button> para revisar antes de continuar.</p>}
    <ErrorNotice error={operation.error} />
    {currentReview ? <div className="space-y-4">
      <h3 className="text-sm font-semibold">Revise antes de concluir</h3>
      <dl className="review-list"><dt>Processo</dt><dd>{caseData.caseNumber}</dd><dt>Encaminhamento</dt><dd>{strategy.action === 'ACORDO' ? 'Acordo · ' + money(strategy.settlement_amount) : 'Defesa'}</dd><dt>Minuta</dt><dd>{draft.title}</dd><dt>Advogado</dt><dd>{currentReview.lawyer_id}</dd><dt>Escritório</dt><dd>{currentReview.law_firm_id}</dd><dt>Justificativa</dt><dd>{strategy.rationale || 'Não informada'}</dd></dl>
      <p className="text-xs text-muted">A confirmação preserva o texto revisado e conclui a análise na plataforma. Ela não protocola o documento nem registra aceite da outra parte.</p>
      <div className="flex flex-wrap gap-3"><button type="button" className="button-primary" disabled={busy || blocked || !checked} onClick={confirm}>Confirmar e concluir análise</button><button type="button" className="button-secondary" disabled={busy} onClick={() => setReview(null)}>Voltar à revisão</button></div>
    </div> : <form onSubmit={prepare} className="space-y-4">
      <p className="text-sm"><strong>{strategy.action === 'ACORDO' ? 'Acordo · ' + money(strategy.settlement_amount) : 'Defesa'}</strong> · {draft.title}</p>
      <div className="grid sm:grid-cols-2 gap-3"><label><span className="field-label">Advogado responsável</span><select className="field" value={lawyer} onChange={event => { const selected = LAWYERS.find(item => item.value === event.target.value); setLawyer(event.target.value); setFirm(selected?.firm || '') }} required disabled={busy || blocked}><option value="">Selecione um advogado</option>{LAWYERS.map(item => <option key={item.value} value={item.value}>{item.value}</option>)}</select></label><label><span className="field-label">Escritório responsável</span><input className="field" value={firm} readOnly aria-readonly="true" placeholder="Preenchido ao selecionar o advogado" required /></label></div>
      <p className="text-[10px] text-muted">Lista demonstrativa, sem integração com cadastro de pessoas ou escritórios.</p>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={checked} onChange={event => setReviewedContent(event.target.checked ? content : null)} required disabled={busy || blocked} />Revisei o texto atual da minuta e confirmo o encaminhamento.</label>
      <button className="button-primary" disabled={busy || blocked || !checked || !content.trim()}>Revisar registro final</button>
    </form>}
    {operation.pending && <Busy>Registrando decisão e texto revisado...</Busy>}
  </div>
}
