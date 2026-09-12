import { useCallback, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { fetchAnalysis, fetchCaseById } from '../../services/api'
import { money, statusLabel } from '../../services/workflow'
import { useRemote } from '../../hooks/useRemote'
import AnalysisPanel from '../../components/Workspace/AnalysisPanel'
import DocumentsPanel from '../../components/Workspace/DocumentsPanel'
import ChatPanel from '../../components/Workspace/ChatPanel'
import DraftsPanel from '../../components/Workspace/DraftsPanel'
import DecisionPanel from '../../components/Workspace/DecisionPanel'
import { Busy, ErrorNotice } from '../../components/Workspace/Shared'

export default function WorkspacePage() {
  const { caseId } = useParams()
  if (!caseId) return <Navigate to="/triagem" replace />
  return <CaseWorkspace key={caseId} caseId={caseId} />
}

function CaseWorkspace({ caseId }) {
  const [copied, setCopied] = useState(false)
  const resource = useRemote(useCallback(async signal => {
    const [detail, envelope] = await Promise.all([fetchCaseById(caseId, { signal }), fetchAnalysis(caseId, { signal })])
    return { caseData: detail.data, envelope }
  }, [caseId]))
  const { caseData, envelope } = resource.data || {}
  const copy = async () => {
    try { await navigator.clipboard.writeText(caseData.caseNumber); setCopied(true) } catch { setCopied(false) }
  }
  return <div className="space-y-7">
    <Link to="/triagem" className="inline-flex items-center gap-2 text-xs text-muted hover:text-ink"><ArrowLeft size={14} />Todos os processos</Link>
    {resource.loading && <Busy>Carregando processo e parecer salvo...</Busy>}
    <ErrorNotice error={resource.error} retry={resource.reload} />
    {caseData && <>
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-line pb-7">
        <div className="space-y-3 min-w-0"><p className="eyebrow">ANÁLISE PROCESSUAL</p><h1 className="break-words">{caseData.claimant}</h1>{caseData.defendant && <p className="text-sm text-muted">Em face de {caseData.defendant}</p>}<div className="flex items-center flex-wrap gap-3 text-xs text-muted"><span>{caseData.caseNumber}</span><button type="button" onClick={copy} aria-label={copied ? 'Número copiado' : 'Copiar número do processo'}>{copied ? <Check size={13} /> : <Copy size={13} />}</button><span>{caseData.court || caseData.state}</span></div></div>
        <div className="flex flex-wrap items-center gap-3 shrink-0"><span className="text-xs border border-line px-3 py-2 rounded">{statusLabel(caseData.status)}</span>{caseData.isSimulated && <span className="text-xs text-muted">Caso simulado</span>}<a className="button-secondary" href="#copiloto">Conversar com copiloto</a><a className="button-primary" href="#minutas">Minutas do caso</a></div>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted"><p>Valor da causa <strong className="text-ink ml-2">{money(caseData.claimValue)}</strong></p><p>{caseData.documents.length} documentos disponíveis</p><button type="button" className="underline underline-offset-4" disabled={resource.loading} onClick={resource.reload}>Atualizar processo</button></div>
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-8 min-w-0 space-y-6">
          <AnalysisPanel caseData={caseData} envelope={envelope} refresh={resource.reload} disabled={resource.loading || !!resource.error} />
          <DocumentsPanel caseData={caseData} />
          <DraftsPanel caseId={caseData.id} />
          <DecisionPanel key={caseData.version} caseData={caseData} envelope={envelope} refresh={resource.reload} disabled={resource.loading || !!resource.error} />
        </div>
        <aside id="copiloto" className="xl:col-span-4 min-w-0 scroll-mt-6"><ChatPanel caseId={caseData.id} /></aside>
      </div>
    </>}
  </div>
}
