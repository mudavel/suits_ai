import { useCallback, useState } from 'react'
import { Bot, Send } from 'lucide-react'
import { fetchChat, fetchChats, sendChat } from '../../services/api'
import { dateTime } from '../../services/workflow'
import { useAction, useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice, Mode, OffsetPager, Sources, Warnings } from './Shared'

export default function ChatPanel({ caseId }) {
  const [offset, setOffset] = useState(0)
  const [selection, setSelection] = useState(undefined)
  const [sending, setSending] = useState(false)
  const [lastResponse, setLastResponse] = useState(null)
  const sessions = useRemote(useCallback(signal => fetchChats(caseId, offset, { signal }), [caseId, offset]))
  const sessionId = selection === undefined ? sessions.data?.items[0]?.session_id : selection
  return <section className="panel space-y-4">
    <div className="section-heading"><h2 className="flex items-center gap-2"><Bot size={19} />Copiloto</h2><button type="button" className="button-secondary" disabled={sending || sessions.loading} onClick={() => setSelection(null)}>Nova conversa</button></div>
    <div className="flex gap-2"><label className="min-w-0 flex-1"><span className="field-label">Conversas salvas</span><select className="field" aria-label="Conversas salvas" value={sessionId || ''} disabled={sending || sessions.loading} onChange={event => setSelection(event.target.value || null)}><option value="">Nova conversa</option>{sessions.data?.items.map(session => <option key={session.session_id} value={session.session_id}>{session.title} · {dateTime(session.updated_at)}</option>)}</select></label><button type="button" className="button-secondary self-end" disabled={sending || sessions.loading} onClick={sessions.reload}>Atualizar</button></div>
    <ErrorNotice error={sessions.error} retry={sessions.reload} />
    <OffsetPager page={sessions.data} offset={offset} setOffset={value => { setSelection(undefined); setOffset(value) }} disabled={sending || sessions.loading} />
    {sessions.loading && <Busy>Buscando conversas...</Busy>}
    {(sessions.data || !sessions.loading) && <Conversation key={sessionId || 'new'} caseId={caseId} sessionId={sessionId} onSending={setSending} onResponse={setLastResponse} onSaved={id => { setSelection(id); setOffset(0); sessions.reload() }} />}
    {lastResponse && lastResponse.session_id === sessionId && <><Mode value={lastResponse.generation_mode} /><Warnings items={lastResponse.warnings} /></>}
  </section>
}

function Conversation({ caseId, sessionId, onSending, onSaved, onResponse }) {
  const history = useRemote(useCallback(signal => sessionId ? fetchChat(caseId, sessionId, { signal }) : Promise.resolve({ messages: [] }), [caseId, sessionId]))
  const operation = useAction()
  const [message, setMessage] = useState('')
  const submit = event => {
    event.preventDefault()
    if (!message.trim() || operation.pending || history.loading || history.error) return
    onSending(true)
    operation.run(() => sendChat(caseId, message.trim(), sessionId), response => {
      setMessage('')
      onResponse(response)
      if (sessionId) history.reload()
      onSaved(response.session_id)
    }).finally(() => onSending(false))
  }
  return <div className="space-y-4">
    {history.loading && <Busy>Carregando histórico...</Busy>}<ErrorNotice error={history.error} retry={history.reload} />
    <div role="log" aria-label="Histórico do copiloto" aria-live="polite" className="chat-messages">{history.data?.messages.length ? history.data.messages.map((item, index) => <article key={index} className={'chat-message ' + (item.role === 'user' ? 'chat-message-user' : '')}><p className="eyebrow mb-2">{item.role === 'user' ? 'VOCÊ' : 'COPILOTO'}</p><p className="response-text">{item.content}</p><Sources caseId={caseId} items={item.sources} /></article>) : !history.loading && <p className="text-xs text-muted leading-relaxed">Pergunte sobre os documentos deste caso. As conversas ficam salvas para continuar depois.</p>}</div>
    <ErrorNotice error={operation.error} />
    {operation.pending && <Busy>O copiloto está preparando a resposta...</Busy>}
    <form onSubmit={submit} className="space-y-2"><label className="field-label" htmlFor="chat-message">Mensagem ao copiloto</label><textarea id="chat-message" className="field min-h-24" maxLength={4000} value={message} onChange={event => setMessage(event.target.value)} disabled={operation.pending} placeholder="Quais documentos sustentam a defesa?" required /><div className="flex items-center justify-between gap-3"><span className="text-[10px] text-muted">{message.length}/4.000 · últimas 20 mensagens</span><button className="button-primary" disabled={operation.pending || history.loading || !!history.error || !message.trim()}><Send size={14} />Enviar</button></div></form>
  </div>
}
