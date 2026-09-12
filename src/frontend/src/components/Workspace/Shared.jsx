import MarkdownContent from '../MarkdownContent'
import { systemText } from '../../services/productLanguage'
import { LoaderCircle, ArrowUpRight } from 'lucide-react'
import { documentUrl } from '../../services/api'

export function ErrorNotice({ error, retry }) {
  if (!error) return null
  return <div role="alert" className="notice notice-error"><p>{error.message}</p>{retry && <button type="button" className="button-secondary mt-3" onClick={retry}>Tentar novamente</button>}</div>
}
export function Busy({ children = 'Carregando...' }) {
  return <p role="status" className="flex items-center gap-2 text-xs text-muted py-3"><LoaderCircle size={15} className="animate-spin shrink-0" />{children}</p>
}
export function Mode({ value }) {
  return <span className="text-[10px] rounded border border-line px-2 py-1 text-muted">{{ local: 'Consulta documental', openai: 'Gerado com IA', mock: 'Demonstração' }[value] || 'Origem não informada'}</span>
}
export function Warnings({ items = [] }) {
  if (!items.length) return null
  return <ul className="notice space-y-2 list-disc pl-7">{items.map((item, index) => <li key={index}><MarkdownContent>{systemText(item)}</MarkdownContent></li>)}</ul>
}
export function Sources({ items = [], caseId }) {
  if (!items.length) return null
  return <details className="sources"><summary>Fontes consultadas ({items.length})</summary><div className="space-y-3 mt-3">{items.map((source, index) => <blockquote key={source.source_id + '-' + index} className="border-l-2 border-accent pl-3"><a href={documentUrl(caseId, source.document_id, source.page)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-ink">{source.document_name} · p. {source.page}<ArrowUpRight size={12} /></a><p className="mt-1 whitespace-pre-wrap">{source.excerpt}</p></blockquote>)}</div></details>
}
export function OffsetPager({ page, offset, setOffset, disabled }) {
  if (!page || (!offset && !page.has_more)) return null
  return <div className="flex items-center justify-between gap-2 text-xs pt-3"><button type="button" className="button-secondary" disabled={disabled || offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Anteriores</button><span>{page.items.length ? offset + 1 : 0}–{Math.min(offset + page.items.length, page.total)} de {page.total}</span><button type="button" className="button-secondary" disabled={disabled || !page.has_more} onClick={() => setOffset(offset + 20)}>Próximos</button></div>
}
