import { useState } from 'react'
import { FileText, ArrowUpRight } from 'lucide-react'
import { documentUrl, fetchDocument } from '../../services/api'
import { useAction } from '../../hooks/useRemote'
import { Busy, ErrorNotice, Sources } from './Shared'

function DocumentItem({ document, caseId }) {
  const [content, setContent] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const operation = useAction()
  const open = () => {
    if (content) setExpanded(!expanded)
    else operation.run(() => fetchDocument(caseId, document.id), data => { setContent(data); setExpanded(true) })
  }
  return <article className="document-item">
    <div className="flex items-start gap-3"><FileText size={20} className="shrink-0 text-muted" /><div className="min-w-0"><h3 className="text-sm font-medium break-words">{document.name}</h3><p className="text-xs text-muted mt-2">{{ AUTOS: 'Autos da ação', SUBSIDIO: 'Subsídio' }[document.category] || 'Documento'} · {document.page_count} {document.page_count === 1 ? 'página' : 'páginas'} · {document.extraction_status === 'ok' ? 'Transcrição disponível' : 'Transcrição parcial ou indisponível'}</p></div></div>
    <div className="flex flex-wrap gap-4 mt-4"><button type="button" className="text-xs underline underline-offset-4" aria-expanded={expanded} disabled={operation.pending} onClick={open}>{expanded ? 'Recolher texto' : 'Ler transcrição'}</button>{document.download_url && <a href={documentUrl(caseId, document.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs">Abrir PDF original<ArrowUpRight size={13} /></a>}</div>
    {operation.pending && <Busy />}
    <ErrorNotice error={operation.error} />
    {expanded && content && <div className="mt-5 space-y-5 max-h-[550px] overflow-y-auto pr-2">{content.pages.map(page => <section key={page.number}><p className="eyebrow mb-2">PÁGINA {page.number}</p><p className="response-text">{page.text || 'Não foi possível transcrever esta página.'}</p></section>)}{!content.pages.length && <p className="text-xs text-muted">Nenhuma página de texto disponível.</p>}</div>}
  </article>
}

export default function DocumentsPanel({ caseData }) {
  const [category, setCategory] = useState('ALL')
  const categories = [{ id: 'ALL', label: 'Todos' }, { id: 'AUTOS', label: 'Autos da ação' }, { id: 'SUBSIDIO', label: 'Subsídios' }]
  const documents = caseData.documents.filter(item => category === 'ALL' || item.category === category)
  return <section className="panel space-y-5">
    <div className="section-heading"><div><h2>Documentos do processo</h2><p className="text-xs text-muted mt-2">Consulte os originais, as transcrições e as verificações das evidências.</p></div></div>
    {!!caseData.checks.length && <details className="sources"><summary>Verificações documentais ({caseData.checks.length})</summary><div className="space-y-4 mt-4">{caseData.checks.map((check, i) => <article key={check.code + i}><p className="field-label">{{ consistent: 'Concordância textual', divergent: 'Divergência', not_verified: 'Não verificado' }[check.status]}</p><p className="text-xs leading-relaxed">{check.message}</p><Sources caseId={caseData.id} items={check.sources} /></article>)}</div></details>}
    <div className="document-filters" role="group" aria-label="Filtrar documentos">{categories.map(item => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label} ({caseData.documents.filter(document => item.id === 'ALL' || document.category === item.id).length})</button>)}</div>
    <div className="space-y-4">
      {documents.map(item => <DocumentItem key={item.id} document={item} caseId={caseData.id} />)}
      {!documents.length && <p className="text-sm text-muted py-8 text-center">Não há documentos nesta seleção.</p>}
    </div>
  </section>
}
