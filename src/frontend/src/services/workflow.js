export const money = value => value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const dateTime = value => value ? new Date(value).toLocaleString('pt-BR') : '—'
export const statusLabel = status => ({ PENDENTE: 'Pendente', EM_ANALISE: 'Em análise', CONCLUIDO: 'Concluído' })[status] || status

export function currentAnalysis(envelope, caseData) {
  const analysis = envelope?.analysis
  return envelope?.status === 'available' && analysis?.case_id === caseData.id && analysis.case_version === caseData.version ? analysis : null
}
export function currentStrategy(envelope, caseData, analysis) {
  const strategy = envelope?.strategy
  return envelope?.status === 'available' && caseData.status !== 'CONCLUIDO' && strategy?.case_id === caseData.id && strategy.case_version === caseData.version && analysis && strategy.analysis_id === analysis.analysis_id ? strategy : null
}
export function draftMatchesStrategy(draft, strategy) {
  return Boolean(draft && strategy && draft.case_id === strategy.case_id && draft.case_version === strategy.case_version && draft.analysis_id === strategy.analysis_id && draft.strategy?.strategy_id === strategy.strategy_id)
}
export function applyStoredAnalysis(caseData, envelope) {
  const analysis = currentAnalysis(envelope, { ...caseData, version: caseData.version ?? envelope.case_version })
  const policy = analysis?.policy
  return { ...caseData, recommendation: policy?.recommendation ?? null, riskLevel: policy?.risk_level ?? null,
    expectedLoss: policy?.settlement_pricing?.expected_loss ?? null,
    settlementPricing: policy?.settlement_pricing ?? null,
    lossProbability: policy?.confidence_score_semantics === 'loss_probability' ? policy.confidence_score : null,
    reasoningCode: policy?.reasoning_code ?? null, analysisStatus: envelope.status }
}
export function policyScore(policy) {
  if (!policy || policy.confidence_score == null) return null
  const label = { loss_probability: 'Probabilidade estimada de derrota', recommendation_confidence: 'Confiança na recomendação' }[policy.confidence_score_semantics]
  if (!label) return null
  return { label, value: policy.confidence_score }
}
export function parseAmount(input) {
  const value = String(input).trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0 || Number(value) > 1e12) throw new Error('Informe um valor positivo com até duas casas decimais, sem separador de milhar.')
  return Number(value)
}
export function requiresOverride(policy, action, amount) {
  return Boolean(policy && (policy.recommendation !== action || (action === 'ACORDO' && policy.settlement_pricing && amount > policy.settlement_pricing.ceiling)))
}
// Keep the exact body/key on transport retries; edits create a new logical attempt.
export function decisionAttempt(previous, body, newId = () => crypto.randomUUID()) {
  const signature = JSON.stringify(body)
  return previous?.signature === signature ? previous : { signature, body: { ...body, idempotency_key: newId() } }
}
