// Vite serves /api through its proxy. Production uses the same-origin API.
import { applyStoredAnalysis } from './workflow.js'
import { errorDetail } from './productLanguage.js'
export { errorDetail } from './productLanguage.js'

const READ_TIMEOUT = 15000
const GENERATION_TIMEOUT = 300000 // Backend may use two 120-second attempts.

async function request(path, { body, signal, timeoutMs = READ_TIMEOUT, binary = false } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal?.addEventListener('abort', abort, { once: true })
  if (signal?.aborted) controller.abort()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      headers: { Accept: binary ? 'application/pdf' : 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const error = new Error(errorDetail(payload.detail, response.status, { writing: body !== undefined }))
      error.status = response.status
      throw error
    }
    if (binary) return { blob: await response.blob(), disposition: response.headers.get('Content-Disposition') }
    return await response.json()
  } catch (error) {
    if (timedOut) throw new Error(body === undefined ? 'A consulta demorou demais. Tente novamente.' : 'O tempo de espera terminou. A operação pode ter sido salva; consulte o histórico antes de repetir.')
    if (error instanceof TypeError) throw new Error(body === undefined ? 'Não foi possível acessar a plataforma. Tente novamente.' : 'A conexão foi interrompida. Consulte o histórico antes de repetir a operação.')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}

export const requestJson = (path, options) => request(path, options)
export const fetchHistoricalCases = (filters, options) => requestJson('/api/monitoring/historical' + query(filters), { timeoutMs: 60000, ...options })
const post = (path, body, options) => requestJson(path, { timeoutMs: GENERATION_TIMEOUT, ...options, body })
const casePath = id => {
  if (!/^[1-9]\d*$/.test(String(id))) throw new Error('Caso não encontrado.')
  return `/api/cases/${id}`
}
const query = values => {
  const params = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'ALL'))
  return params.size ? `?${params}` : ''
}
const idPath = id => encodeURIComponent(id)
export const documentUrl = (caseId, documentId, page = 1) => `${casePath(caseId)}/documents/${idPath(documentId)}/download#page=${Math.max(1, Number(page) || 1)}`

export function mapCase(item) {
  const presence = item.subsidies || {}
  return {
    id: item.id, caseNumber: item.case_number, title: item.title,
    claimant: item.claimant_name || item.title, defendant: item.defendant_name ?? null,
    claimantCpf: null, court: item.court ?? null, state: item.uf, claimValue: item.cause_value,
    status: item.status, version: item.version, riskLevel: item.risk_level, recommendation: item.recommendation,
    expectedLoss: null, lossProbability: null, settlementPricing: null, reasoningCode: null,
    reasoningTitle: item.title, reasoningDescription: item.sub_issue, daysToHearing: null,
    isSimulated: item.is_simulated ?? null, dataMode: item.data_mode,
    documents: item.documents || [], claims: item.claims || [], checks: item.checks || [], facts: item.facts || [],
    subsidies: { contract: { ok: presence.has_contract }, bankStatement: { ok: presence.has_statement }, bacen: { ok: presence.has_credit_receipt } },
  }
}

export async function fetchCases({ page, pageSize, status, uf, signal, includeAnalysis = false } = {}) {
  const envelope = await requestJson('/api/cases' + query({ page, page_size: pageSize, status, uf }), { signal })
  if (!Array.isArray(envelope.items)) throw new Error('Não foi possível ler a lista de processos.')
  const data = envelope.items.map(mapCase)
  if (includeAnalysis) {
    // The list DTO does not include the saved policy. Bound concurrency for large pages.
    for (let start = 0; start < data.length; start += 6) {
      if (signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
      await Promise.all(data.slice(start, start + 6).map(async (item, index) => {
        try {
          const analyzed = applyStoredAnalysis(item, await fetchAnalysis(item.id, { signal }))
          if (item.status === 'CONCLUIDO') {
            const records = await fetchDecisions(item.id, 0, { signal })
            data[start + index] = { ...analyzed, recommendation: records.items[0]?.decision.action ?? null, definitionSource: 'decision' }
          } else data[start + index] = analyzed
        }
        catch (error) {
          if (error.name === 'AbortError') throw error
          data[start + index] = { ...item, recommendation: null, riskLevel: null, analysisError: true }
        }
      }))
    }
  }
  return { data, isMock: envelope.data_mode === 'mock', total: envelope.total, page: envelope.page, pageSize: envelope.page_size, totalPages: envelope.total_pages }
}
export async function fetchCaseById(id, options) {
  const item = await requestJson(casePath(id), options)
  return { data: mapCase(item), isMock: item.data_mode === 'mock' }
}
export const fetchAnalysis = (id, options) => requestJson(`${casePath(id)}/analysis`, options)
export const analyzeCase = id => post('/api/analyze', { case_id: Number(id) })
export const fetchStrategy = (id, options) => requestJson(casePath(id) + '/strategy', options)
export const saveStrategy = values => post('/api/strategy', values)
export const generateScenarios = id => post('/api/scenarios', { case_id: Number(id) })
export const fetchDocument = (id, documentId, options) => requestJson(`${casePath(id)}/documents/${idPath(documentId)}`, options)
export const fetchChats = (id, offset = 0, options) => requestJson(`${casePath(id)}/chats${query({ limit: 20, offset })}`, options)
export const fetchChat = (id, sessionId, options) => requestJson(`${casePath(id)}/chat/${idPath(sessionId)}`, options)
export const sendChat = (id, message, sessionId) => post('/api/chat', { case_id: Number(id), message, ...(sessionId ? { session_id: sessionId } : {}) })
export const fetchDrafts = (id, offset = 0, options) => requestJson(`${casePath(id)}/drafts${query({ limit: 20, offset })}`, options)
export const fetchDraft = (draftId, options) => requestJson(`/api/drafts/${idPath(draftId)}`, options)
export const generateDraft = (id, values) => post('/api/generate-draft', { case_id: Number(id), ...values })
export const exportDraft = (draftId, content) => request('/api/export-pdf', { body: { draft_id: draftId, format: 'pdf', content_markdown: content }, binary: true, timeoutMs: 60000 })
export const negotiate = (id, amount) => post('/api/negotiation-copilot', { case_id: Number(id), proposed_amount: amount })
export const recordDecision = body => post('/api/decisions', body, { timeoutMs: 30000 })
export const fetchDecisions = (id, offset = 0, options) => requestJson('/api/decisions' + query({ case_id: id, limit: 20, offset }), options)
