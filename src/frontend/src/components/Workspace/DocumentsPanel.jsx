import MarkdownContent from '../MarkdownContent'
import { useState } from 'react'
import { FileText, ArrowUpRight } from 'lucide-react'
import { documentUrl, fetchDocument, generateScenarios } from '../../services/api'
import { useAction } from '../../hooks/useRemote'
import { Busy, ErrorNotice, Mode, Sources, Warnings } from './Shared'

function DocumentItem({ document, caseId }) {
  const [content, setContent] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const operation = useAction()
  const open = () => {
    if (content) setExpanded(!expanded)
    else operation.run(() => fetchDocument(caseId, document.id), data => { setContent(data); setExpanded(true) })
  }
  return <article className="document-item">
    <div className="flex items-start gap-3"><FileText size={20} className="shrink-0 text-muted" /><div className="min-w-0"><h3 className="text-sm font-medium break-words">{document.name}</h3><p className="text-xs text-muted mt-2">{document.page_count} {document.page_count === 1 ? 'página' : 'páginas'} · {document.extraction_status === 'ok' ? 'Transcrição disponível' : 'Transcrição parcial ou indisponível'}</p></div></div>
    {document.text_excerpt && !expanded && <p className="document-excerpt">{document.text_excerpt}</p>}
    <div className="flex flex-wrap gap-4 mt-4"><button type="button" className="text-xs underline underline-offset-4" disabled={operation.pending} onClick={open}>{expanded ? 'Recolher texto' : 'Ler transcrição'}</button>{document.download_url && <a href={documentUrl(caseId, document.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs">Abrir PDF original<ArrowUpRight size={13} /></a>}</div>
    {operation.pending && <Busy />}
    <ErrorNotice error={operation.error} />
    {expanded && content && <div className="mt-5 space-y-5 max-h-[550px] overflow-y-auto pr-2">{content.pages.map(page => <section key={page.number}><p className="eyebrow mb-2">PÁGINA {page.number}</p><p className="response-text">{page.text || 'Não foi possível transcrever esta página.'}</p></section>)}{!content.pages.length && <p className="text-xs text-muted">Nenhuma página de texto disponível.</p>}</div>}
  </article>
}

export default function DocumentsPanel({ caseData }) {
  const [tab, setTab] = useState('AUTOS')
  const [scenarios, setScenarios] = useState(null)
  const operation = useAction()
  const tabs = [{ id: 'AUTOS', label: 'Autos da ação' }, { id: 'SUBSIDIO', label: 'Subsídios' }, { id: 'CENARIOS', label: 'Estratégia processual' }]
  const changeTab = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = tabs.findIndex(item => item.id === tab)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : -1) + 3) % 3
    setTab(tabs[next].id)
    document.getElementById('tab-' + tabs[next].id)?.focus()
  }
  const documents = caseData.documents.filter(item => item.category === tab)
  return <section className="border border-line rounded-lg overflow-hidden min-w-0">
    <div className="workspace-tabs" role="tablist" aria-label="Documentos e estratégia">{tabs.map(item => <button key={item.id} id={'tab-' + item.id} role="tab" type="button" aria-selected={tab === item.id} aria-controls="document-panel" tabIndex={tab === item.id ? 0 : -1} className={'workspace-tab ' + (tab === item.id ? 'workspace-tab--active' : '')} onKeyDown={changeTab} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    <div id="document-panel" role="tabpanel" aria-labelledby={'tab-' + tab} className="p-5 sm:p-6 space-y-5">
      {tab === 'CENARIOS' ? <>
        <div className="section-heading"><h2>Cenários do caso</h2><button type="button" className="button-primary" disabled={operation.pending} onClick={() => operation.run(() => generateScenarios(caseData.id), setScenarios)}>{scenarios ? 'Atualizar cenários' : 'Gerar cenários'}</button></div>
        {operation.pending && <Busy>Preparando argumentos e limitações...</Busy>}<ErrorNotice error={operation.error} />
        {scenarios ? <><Mode value={scenarios.generation_mode} /><div className="grid sm:grid-cols-2 gap-6">{[['Alegações do autor', scenarios.author_arguments], ['Argumentos da defesa', scenarios.defense_arguments]].map(([title, argumentsList]) => <section key={title}><h3 className="text-sm font-semibold mb-4">{title}</h3><div className="space-y-4">{argumentsList.map((argument, i) => <article key={i}><MarkdownContent>{argument.text}</MarkdownContent><Sources caseId={caseData.id} items={argument.sources} /></article>)}</div></section>)}</div><h3 className="text-sm font-semibold">Perspectiva judicial</h3><MarkdownContent>{scenarios.judicial_outlook}</MarkdownContent><Warnings items={scenarios.limitations} /></> : <p className="text-sm text-muted">Explore argumentos, fontes e limitações a partir dos documentos deste processo.</p>}
      </> : <>{documents.map(item => <DocumentItem key={item.id} document={item} caseId={caseData.id} />)}{!documents.length && <p className="text-sm text-muted py-8 text-center">Não há documentos desta categoria.</p>}</>}
    </div>
  </section>
}
