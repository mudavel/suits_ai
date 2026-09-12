import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, FileText, Files, Swords, Bot, Send, Download, LoaderCircle, Copy, Check } from 'lucide-react'
import { fetchCaseById } from '../../services/api'

const money = value => value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function WorkspacePage() {
  const { caseId } = useParams()
  if (!caseId) return <Navigate to="/triagem" replace />
  return <CaseWorkspace key={caseId} caseId={caseId} />
}

function CaseWorkspace({ caseId }) {
  const [activeTab, setActiveTab] = useState('AUTOS')
  const [currentCase, setCurrentCase] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    if (caseId) fetchCaseById(caseId).then(({ data }) => {
      if (active) { setCurrentCase(data); setLoading(false) }
    }).catch(e => { if (active) { setError(e.status === 404 ? 'Este processo não foi encontrado.' : 'Não foi possível abrir o processo. Volte à lista e tente novamente.'); setLoading(false) } })
    return () => { active = false }
  }, [caseId])

  const copyCaseNumber = async () => {
    try { await navigator.clipboard.writeText(currentCase.caseNumber); setCopied(true) } catch { setCopied(false) }
  }
  const visibleDocuments = currentCase?.documents.filter(doc => doc.category === activeTab) || []
  const handleTabKey = (event) => {
    const tabs = ['AUTOS', 'SUBSIDIO', 'CENARIOS']
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const position = tabs.indexOf(activeTab)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (position + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    setActiveTab(tabs[next])
    document.getElementById('tab-' + tabs[next])?.focus()
  }

  return (
    <div className="space-y-7">
      <Link to="/triagem" className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"><ArrowLeft size={14} /> Todos os processos</Link>
      {loading ? <div role="status" className="py-24 flex justify-center gap-3 text-muted text-sm"><LoaderCircle className="animate-spin" size={18} /> Carregando o processo...</div> : error ? <div role="alert" className="border border-line rounded-lg p-12 text-center text-muted">{error}</div> : <>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-line pb-7">
          <div className="space-y-3 min-w-0">
            <p className="eyebrow">WORKSPACE / PROCESSO {currentCase.id}</p>
            <h1 className="break-words">{currentCase.claimant}</h1>
            {currentCase.defendant && <p className="text-sm text-muted">Em face de {currentCase.defendant}</p>}
            <div className="flex items-center flex-wrap gap-2 text-xs text-muted">
              <span>{currentCase.caseNumber}</span><button type="button" onClick={copyCaseNumber} aria-label={copied ? 'Número copiado' : 'Copiar número do processo'}>{copied ? <Check size={13} /> : <Copy size={13} />}</button>
              <span className="mx-1 text-line">/</span><span>{currentCase.court || currentCase.state}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {currentCase.isSimulated && <span className="text-[10px] px-2.5 py-1.5 border border-line rounded text-muted">Caso simulado</span>}
            <button type="button" disabled title="Geração de minutas indisponível nesta prévia" className="inline-flex items-center gap-2 bg-accent rounded-lg px-4 py-2.5 text-xs text-ink"><Download size={14} /> Gerar minuta</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
          <section className="lg:col-span-8 border border-line rounded-lg overflow-hidden min-w-0">
            <div className="workspace-tabs" role="tablist" aria-label="Documentos e estratégia">
              {[{ id: 'AUTOS', label: 'Autos da ação', icon: FileText }, { id: 'SUBSIDIO', label: 'Subsídios do banco', icon: Files }, { id: 'CENARIOS', label: 'War room', icon: Swords }].map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} aria-controls="workspace-panel" tabIndex={activeTab === id ? 0 : -1} onKeyDown={handleTabKey} id={'tab-' + id} onClick={() => setActiveTab(id)} className={'workspace-tab ' + (activeTab === id ? 'workspace-tab--active' : '')}><Icon size={14} />{label}</button>)}
            </div>
            <div id="workspace-panel" role="tabpanel" aria-labelledby={'tab-' + activeTab} className="p-5 sm:p-7 min-h-[390px]">
              {activeTab === 'CENARIOS' ? <div className="empty-panel"><Swords size={28} strokeWidth={1} /><h2>Estratégia com contexto</h2><p>Os cenários do caso serão apresentados aqui. Nenhuma análise foi gerada nesta prévia.</p></div> :
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3"><p className="eyebrow">{activeTab === 'AUTOS' ? 'DOCUMENTOS DO PROCESSO' : 'DOCUMENTOS BANCÁRIOS'}</p><span className="text-[10px] text-muted">{visibleDocuments.length} {visibleDocuments.length === 1 ? 'documento' : 'documentos'}</span></div>
                  {visibleDocuments.map(doc => <article key={doc.id} className="document-item">
                    <div className="flex items-start gap-3"><FileText size={20} strokeWidth={1.2} className="shrink-0 mt-1 text-muted" /><div className="min-w-0 flex-1"><h3 className="text-sm font-medium break-words">{doc.name}</h3><p className="text-[10px] text-muted mt-2">{doc.page_count} páginas · {doc.extraction_status === 'ok' ? 'Texto disponível' : 'Extração parcial ou indisponível'}</p></div></div>
                    {doc.text_excerpt && <p className="document-excerpt">{doc.text_excerpt}</p>}
                    {doc.download_url?.startsWith('/api/cases/') && <a href={doc.download_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 mt-4 text-xs text-ink border-b border-accent pb-1">Abrir PDF original <ArrowUpRight size={14} /></a>}
                  </article>)}
                  {visibleDocuments.length === 0 && <div className="empty-panel"><Files size={28} strokeWidth={1} /><h2>Nenhum documento disponível</h2><p>Não há documentos desta categoria neste caso.</p></div>}
                </div>}
            </div>
          </section>
          <aside className="lg:col-span-4 space-y-5">
            <section className="border border-line rounded-lg p-6 space-y-5">
              <p className="eyebrow">VISÃO DO CASO</p>
              <div><p className="text-xs text-muted mb-1.5">Valor da causa</p><p className="text-2xl tracking-tight">{money(currentCase.claimValue)}</p></div>
              <div className="border-t border-line pt-4"><p className="text-xs text-muted mb-2">Recomendação</p><span className="text-xs bg-surface rounded px-2.5 py-1.5">{currentCase.recommendation || 'Indisponível'}</span></div>
              <div className="border-t border-line pt-4"><p className="text-xs text-muted mb-2">Faixa de acordo</p><p className="text-xs text-muted">Nenhuma faixa disponível nesta prévia.</p></div>
            </section>
            <section className="border border-line rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-line"><Bot size={17} strokeWidth={1.3} /><h2 className="text-lg">Copiloto</h2><span className="ml-auto text-[9px] text-muted uppercase tracking-wider">Em preparação</span></div>
              <div className="empty-panel py-10"><span className="copilot-symbol" aria-hidden="true">↳</span><p>Um espaço para explorar os documentos e aprofundar a análise do caso.</p><p>O chat ainda não está disponível nesta prévia.</p></div>
              <div className="flex gap-2 border-t border-line p-3"><input type="text" disabled placeholder="Perguntar ao copiloto..." aria-label="Mensagem ao copiloto, indisponível nesta prévia" className="min-w-0 flex-1 bg-surface rounded px-3 py-2 text-xs" /><button type="button" disabled aria-label="Enviar mensagem, indisponível nesta prévia" className="bg-accent rounded px-3"><Send size={15} /></button></div>
            </section>
          </aside>
        </div>
      </>}
    </div>
  )
}
