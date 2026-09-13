import { useCallback, useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { exportDraft, fetchDraft, fetchDrafts } from '../../services/api'
import { currentAnalysis, currentStrategy, dateTime, draftMatchesStrategy } from '../../services/workflow'
import { useAction, useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, Mode, OffsetPager, Sources } from './Shared'

export default function DraftsPanel({ caseData, envelope, strategyEnvelope, refresh, disabled, generatedDraft, onBusy, onDraftStateChange }) {
  const caseId = caseData.id
  const analysis = currentAnalysis(envelope, caseData)
  const strategy = currentStrategy(strategyEnvelope, caseData, analysis)
  const [offset, setOffset] = useState(0)
  const [draft, setDraft] = useState(generatedDraft || null)
  const [content, setContent] = useState(generatedDraft?.content_markdown || '')
  const [exported, setExported] = useState(false)
  const [editing, setEditing] = useState(Boolean(generatedDraft))
  const operation = useAction()
  const drafts = useRemote(useCallback(signal => fetchDrafts(caseId, offset, { signal }), [caseId, offset]))
  const dirty = draft && content !== draft.content_markdown
  const currentDraft = draftMatchesStrategy(draft, strategy)
  const closed = caseData.status === 'CONCLUIDO'
  const busy = operation.pending || disabled
  useEffect(() => { onDraftStateChange?.({ draft, content }) }, [draft, content, onDraftStateChange])
  useEffect(() => { onBusy?.(operation.pending) }, [operation.pending, onBusy])
  const selectDraft = value => { setDraft(value); setContent(value.content_markdown); setExported(false); setEditing(false) }
  const download = () => operation.run(() => exportDraft(draft.draft_id, content), ({ blob }) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'minuta-' + draft.draft_id + '.pdf'
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    setExported(true)
  })
  return <section id="drafts-panel" className="space-y-5" aria-labelledby="drafts-heading">
    <div className="section-heading"><h3 id="drafts-heading" className="text-sm font-semibold">Minuta</h3><button type="button" className="button-secondary" onClick={drafts.reload} disabled={operation.pending || drafts.loading}>Atualizar histórico</button></div>
    {operation.pending && <Busy>Preparando o documento...</Busy>}<ErrorNotice error={operation.error} retry={operation.error?.status === 409 ? refresh : undefined} />
    <ErrorNotice error={drafts.error} retry={drafts.reload} />
    {drafts.loading ? <Busy>Carregando minutas salvas...</Busy> : <div className="space-y-2">{drafts.data?.items.map(item => <button key={item.draft_id} type="button" className={'saved-item ' + (draft?.draft_id === item.draft_id ? 'saved-item-selected' : '')} disabled={busy || dirty} onClick={() => operation.run(() => fetchDraft(item.draft_id), selectDraft)}><span>{item.title}</span><span className="text-[10px] text-muted">{dateTime(item.created_at)} · {item.strategy?.strategy_id === strategy?.strategy_id && item.strategy ? 'Encaminhamento atual' : item.strategy ? 'Encaminhamento anterior' : 'Minuta anterior sem encaminhamento vinculado'}</span></button>)}{!drafts.data?.items.length && <p className="text-xs text-muted">Nenhuma minuta salva neste caso.</p>}</div>}
    <OffsetPager page={drafts.data} offset={offset} setOffset={setOffset} disabled={busy || drafts.loading || dirty} />
    {draft && <div className="space-y-4 border-t border-line pt-5">
      <div className="section-heading"><h3 className="text-sm font-semibold">{draft.title}</h3><Mode value={draft.generation_mode} /></div>
      {!closed && !currentDraft && <p className="notice">Esta minuta não corresponde ao encaminhamento atual. Ela permanece disponível para consulta e exportação; gere uma nova minuta para concluir a análise.</p>}
      <div className="flex flex-wrap gap-3 items-center">
        <button type="button" className="button-secondary" aria-expanded={editing} aria-controls={'draft-editor-' + caseId} onClick={() => setEditing(!editing)}>{editing ? 'Fechar edição' : 'Editar texto'}</button>
        <button type="button" className="button-primary" disabled={busy || !content.trim()} onClick={download}><Download size={15} />Exportar PDF</button>
        <span role="status" className="text-xs text-muted">{exported ? 'PDF exportado com o texto atual.' : dirty ? 'Edição mantida nesta tela.' : ''}</span>
      </div>
      <div id={'draft-editor-' + caseId} hidden={!editing} className="space-y-4">
        <p className="text-xs text-muted">A exportação inclui suas edições. Ao concluir a análise, o texto revisado também será preservado no registro.</p>
        <label className="block"><span className="field-label">Texto da minuta</span><textarea className="field draft-editor" aria-label="Texto da minuta" maxLength={60000} value={content} onChange={event => { setContent(event.target.value); setExported(false) }} disabled={busy} /></label>
        {dirty && <button type="button" className="button-secondary" disabled={busy} onClick={() => { setContent(draft.content_markdown); setExported(false) }}>Descartar edição</button>}
        <Sources caseId={caseId} items={draft.sources} />
      </div>
      {dirty && <p className="text-xs text-muted">Exporte, copie ou registre o texto revisado antes de sair do processo. Para abrir ou gerar outra minuta, descarte a edição atual.</p>}
    </div>}
  </section>
}
