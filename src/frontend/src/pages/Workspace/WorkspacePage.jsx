import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Check, MessageSquare, X } from 'lucide-react'
import { fetchAnalysis, fetchCaseById, fetchStrategy } from '../../services/api'
import { money, statusLabel } from '../../services/workflow'
import { useRemote } from '../../hooks/useRemote'
import AnalysisPanel from '../../components/Workspace/AnalysisPanel'
import DocumentsPanel from '../../components/Workspace/DocumentsPanel'
import ChatPanel from '../../components/Workspace/ChatPanel'
import PreparationPanel from '../../components/Workspace/PreparationPanel'
import DecisionPanel from '../../components/Workspace/DecisionPanel'
import ProcessTimeline from '../../components/Workspace/ProcessTimeline'
import { Busy, ErrorNotice } from '../../components/Workspace/Shared'
import { currentAnalysis, currentStrategy } from '../../services/workflow'

const sections = [
  { id: 'parecer', label: 'Parecer' },
  { id: 'encaminhamento', label: 'Encaminhamento e minuta' },
  { id: 'conclusao', label: 'Conclusão' },
  { id: 'documentos', label: 'Documentos' },
]

export default function WorkspacePage() {
  const { caseId } = useParams()
  if (!caseId) return <Navigate to="/triagem" replace />
  return <CaseWorkspace key={caseId} caseId={caseId} />
}

function CaseWorkspace({ caseId }) {
  const location = useLocation()
  const navigate = useNavigate()
  const requested = new URLSearchParams(location.search).get('aba')
  const activeSection = requested === 'decisao' || requested === 'minutas' || location.hash === '#decisao' ? 'conclusao' : sections.find(section => section.id === requested)?.id || sections.find(section => '#' + section.id === location.hash)?.id || 'parecer'
  const [copied, setCopied] = useState(false)
  const [draftState, setDraftState] = useState({ draft: null, content: '' })
  const [copilot, setCopilot] = useState({ open: location.hash === '#copiloto', visited: location.hash === '#copiloto' })
  const copilotTrigger = useRef(null)
  const copilotClose = useRef(null)
  useEffect(() => {
    if (copilot.open) copilotClose.current?.focus()
  }, [copilot.open])
  useEffect(() => {
    const legacySection = location.hash === '#decisao' ? { id: 'conclusao' } : sections.find(section => '#' + section.id === location.hash)
    if (legacySection) {
      const params = new URLSearchParams(location.search)
      params.set('aba', legacySection.id)
      navigate({ search: params.toString(), hash: '' }, { replace: true, preventScrollReset: true })
    }
  }, [location.hash, location.search, navigate])
  const resource = useRemote(useCallback(async signal => {
    const [detail, envelope, strategyEnvelope] = await Promise.all([fetchCaseById(caseId, { signal }), fetchAnalysis(caseId, { signal }), fetchStrategy(caseId, { signal })])
    return { caseData: detail.data, envelope, strategyEnvelope }
  }, [caseId]))
  const { caseData, envelope, strategyEnvelope } = resource.data || {}
  const analysis = caseData ? currentAnalysis(envelope, caseData) : null
  const strategy = caseData ? currentStrategy(strategyEnvelope, caseData, analysis) || strategyEnvelope?.strategy : null
  const copy = async () => {
    try { await navigator.clipboard.writeText(caseData.caseNumber); setCopied(true) } catch { setCopied(false) }
  }
  const selectSection = id => {
    const params = new URLSearchParams(location.search)
    params.set('aba', id)
    navigate({ search: params.toString(), hash: '' }, { preventScrollReset: true })
    document.getElementById('workspace-tab-' + id)?.focus()
  }
  const changeTab = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const index = sections.findIndex(section => section.id === activeSection)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + sections.length) % sections.length
    selectSection(sections[next].id)
    document.getElementById('workspace-tab-' + sections[next].id)?.focus()
  }
  const closeCopilot = () => {
    setCopilot(previous => ({ ...previous, open: false }))
    copilotTrigger.current?.focus()
  }
  return <div className="space-y-5">
    <Link to="/triagem" className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"><ArrowLeft size={14} />Todos os processos</Link>
    {resource.loading && <Busy>Carregando processo e parecer salvo...</Busy>}
    <ErrorNotice error={resource.error} retry={resource.reload} />
    {caseData && <>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-line pb-5">
        <div className="space-y-3 min-w-0"><p className="eyebrow">PROCESSO</p><h1 className="break-words">{caseData.claimant}</h1>{caseData.defendant && <p className="text-sm text-muted">Em face de {caseData.defendant}</p>}<div className="flex items-center flex-wrap gap-3 text-xs text-muted"><span>{caseData.caseNumber}</span><button type="button" onClick={copy} aria-label={copied ? 'Número copiado' : 'Copiar número do processo'}>{copied ? <Check size={13} /> : <Copy size={13} />}</button><span>{caseData.court || caseData.state}</span></div></div>
        <div className="flex flex-wrap items-center gap-3 shrink-0"><span className="text-xs border border-line px-3 py-2 rounded">{statusLabel(caseData.status)}</span>{caseData.isSimulated && <span className="text-xs text-muted">Caso simulado</span>}</div>
      </div>
      <div className="section-heading text-xs text-muted"><div className="flex flex-wrap items-center gap-x-8 gap-y-3"><p>Valor da causa <strong className="text-ink ml-2">{money(caseData.claimValue)}</strong></p><button type="button" className="underline underline-offset-4" disabled={resource.loading} onClick={resource.reload}>Atualizar processo</button></div><button ref={copilotTrigger} type="button" className="button-secondary" aria-expanded={copilot.open} aria-controls="case-copilot" onClick={() => setCopilot(previous => ({ open: !previous.open, visited: true }))}><MessageSquare size={15} />Tirar dúvida com o copiloto</button></div>
      <ProcessTimeline caseData={caseData} analysis={envelope?.analysis} strategy={strategyEnvelope?.strategy} />
      <div className="workspace-tabs" role="tablist" aria-label="Etapas do processo">{sections.map(section => <button key={section.id} id={'workspace-tab-' + section.id} type="button" role="tab" aria-selected={activeSection === section.id} aria-controls={'workspace-panel-' + section.id} tabIndex={activeSection === section.id ? 0 : -1} className={'workspace-tab ' + (activeSection === section.id ? 'workspace-tab--active' : '')} onKeyDown={changeTab} onClick={() => selectSection(section.id)}>{section.label}{section.id === 'documentos' && <span className="tab-count">{caseData.documents.length}</span>}</button>)}</div>
      <div className={'case-workspace-body ' + (copilot.open ? 'case-workspace-body--with-copilot' : '')}>
        <div className="case-workspace-main">
          {/* Keep panels mounted so changing tasks preserves edits, comparisons and pending work. */}
          <div id="workspace-panel-parecer" role="tabpanel" aria-labelledby="workspace-tab-parecer" tabIndex={0} hidden={activeSection !== 'parecer'}><AnalysisPanel caseData={caseData} envelope={envelope} refresh={resource.reload} disabled={resource.loading || !!resource.error} onNavigate={selectSection} /></div>
          <div id="workspace-panel-documentos" role="tabpanel" aria-labelledby="workspace-tab-documentos" tabIndex={0} hidden={activeSection !== 'documentos'}><DocumentsPanel caseData={caseData} /></div>
          <div id="workspace-panel-encaminhamento" role="tabpanel" aria-labelledby="workspace-tab-encaminhamento" tabIndex={0} hidden={activeSection !== 'encaminhamento'}>
            <PreparationPanel caseData={caseData} envelope={envelope} strategyEnvelope={strategyEnvelope} refresh={resource.reload} disabled={resource.loading || !!resource.error} onNavigate={selectSection} draftState={draftState} onDraftStateChange={setDraftState} />
          </div>
          <div id="workspace-panel-conclusao" role="tabpanel" aria-labelledby="workspace-tab-conclusao" tabIndex={0} hidden={activeSection !== 'conclusao'}><section className="panel"><DecisionPanel caseData={caseData} strategy={strategy} draft={draftState.draft} content={draftState.content} refresh={resource.reload} disabled={resource.loading || !!resource.error} /></section></div>
        </div>
        <aside id="case-copilot" aria-label="Copiloto do processo" hidden={!copilot.open} className="case-copilot" onKeyDown={event => { if (event.key === 'Escape') closeCopilot() }}>
          <div className="flex justify-end mb-3"><button ref={copilotClose} type="button" className="button-secondary" onClick={closeCopilot}><X size={14} />Fechar copiloto</button></div>
          {copilot.visited && <ChatPanel caseId={caseData.id} />}
        </aside>
      </div>
    </>}
  </div>
}
