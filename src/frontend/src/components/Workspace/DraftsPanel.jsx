import MarkdownContent from '../MarkdownContent'
import { useCallback, useState } from 'react'
import { Download } from 'lucide-react'
import { exportDraft, fetchDraft, fetchDrafts, generateDraft } from '../../services/api'
import { dateTime, parseAmount } from '../../services/workflow'
import { useAction, useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, Mode, OffsetPager, Sources } from './Shared'

export default function DraftsPanel({ caseId }) {
  const [offset, setOffset] = useState(0)
  const [action, setAction] = useState('DEFESA')
  const [amount, setAmount] = useState('')
  const [format, setFormat] = useState('formal')
  const [draft, setDraft] = useState(null)
  const [content, setContent] = useState('')
  const [exported, setExported] = useState(false)
  const [editing, setEditing] = useState(false)
  const operation = useAction()
  const drafts = useRemote(useCallback(signal => fetchDrafts(caseId, offset, { signal }), [caseId, offset]))
  const dirty = draft && content !== draft.content_markdown
  const selectDraft = value => { setDraft(value); setContent(value.content_markdown); setExported(false); setEditing(false) }
  const generate = event => {
    event.preventDefault()
    operation.run(() => generateDraft(caseId, { action, format: action === 'DEFESA' ? 'formal' : format, ...(action === 'ACORDO' ? { settlement_amount: parseAmount(amount) } : {}) }), value => {
      selectDraft(value)
      setOffset(0)
      drafts.reload()
    })
  }
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
  return <section id="minutas" className="panel space-y-5 scroll-mt-6">
    <div className="section-heading"><div><p className="eyebrow">ELABORAÇÃO E REVISÃO</p><h2>Minutas</h2></div><button type="button" className="button-secondary" onClick={drafts.reload} disabled={operation.pending || drafts.loading}>Atualizar histórico</button></div>
    <form onSubmit={generate} className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3"><label><span className="field-label">Tipo de minuta</span><select className="field" value={action} onChange={event => setAction(event.target.value)} disabled={operation.pending || dirty}><option value="DEFESA">Defesa</option><option value="ACORDO">Acordo</option></select></label>
      {action === 'ACORDO' && <><label><span className="field-label">Valor do acordo (R$)</span><input className="field" aria-label="Valor da minuta de acordo" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="2500,00" required disabled={operation.pending || dirty} /></label><label><span className="field-label">Formato</span><select className="field" value={format} onChange={event => setFormat(event.target.value)} disabled={operation.pending || dirty}><option value="formal">Formal</option><option value="whatsapp">Mensagem para WhatsApp</option></select></label></>}
      </div><button className="button-primary" disabled={operation.pending || dirty}>Elaborar minuta</button>
    </form>
    {operation.pending && <Busy>Preparando o documento...</Busy>}<ErrorNotice error={operation.error} />
    <ErrorNotice error={drafts.error} retry={drafts.reload} />
    {drafts.loading ? <Busy>Carregando minutas salvas...</Busy> : <div className="space-y-2">{drafts.data?.items.map(item => <button key={item.draft_id} type="button" className={'saved-item ' + (draft?.draft_id === item.draft_id ? 'saved-item-selected' : '')} disabled={operation.pending || dirty} onClick={() => operation.run(() => fetchDraft(item.draft_id), selectDraft)}><span>{item.title}</span><span className="text-[10px] text-muted">{dateTime(item.created_at)} · Revisão necessária</span></button>)}{!drafts.data?.items.length && <p className="text-xs text-muted">Nenhuma minuta salva neste caso.</p>}</div>}
    <OffsetPager page={drafts.data} offset={offset} setOffset={setOffset} disabled={operation.pending || drafts.loading || dirty} />
    {draft && <div className="space-y-4 border-t border-line pt-5">
      <div className="section-heading"><h3 className="text-sm font-semibold">{draft.title}</h3><Mode value={draft.generation_mode} /></div>
      <p className="notice">Revise a peça antes de utilizá-la. Suas alterações serão incluídas no PDF exportado; o documento original permanece no histórico. Exporte ou copie suas alterações antes de sair.</p>
      <button type="button" className="button-secondary" aria-pressed={editing} onClick={() => setEditing(!editing)}>{editing ? 'Visualizar documento' : 'Editar texto'}</button>
      {editing ? <label className="block"><span className="field-label">Texto da minuta</span><textarea className="field draft-editor" aria-label="Texto da minuta" maxLength={60000} value={content} onChange={event => { setContent(event.target.value); setExported(false) }} disabled={operation.pending} /></label> : <div className="draft-preview"><MarkdownContent>{content}</MarkdownContent></div>}
      <div className="flex flex-wrap gap-3 items-center"><button type="button" className="button-primary" disabled={operation.pending || !content.trim()} onClick={download}><Download size={15} />Exportar PDF revisado</button>{dirty && <button type="button" className="button-secondary" disabled={operation.pending} onClick={() => { setContent(draft.content_markdown); setExported(false) }}>Descartar edição</button>}<span role="status" className="text-xs text-muted">{exported ? 'PDF exportado com o texto atual.' : dirty ? 'Alterações ainda não exportadas.' : ''}</span></div>
      {dirty && <p className="text-xs text-muted">Exporte ou copie sua edição antes de sair. Para abrir ou gerar outra minuta, descarte a edição atual.</p>}
      <Sources caseId={caseId} items={draft.sources} />
    </div>}
  </section>
}
