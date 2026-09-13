import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { analyzeCase, exportDraft, fetchAnalysis, fetchCaseById, fetchCases, fetchChat, fetchChats, fetchDecisions, fetchDocument, fetchDraft, fetchDrafts, fetchStrategy, generateDraft, generateScenarios, negotiate, recordDecision, requestJson, sendChat } from '../src/services/api.js'
import { prepareDraft } from '../src/services/draftWorkflow.js'

const base = process.env.SUITS_TEST_API_URL
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base) || process.env.SUITS_ISOLATED_TEST !== '1') {
  throw new Error('Execute scripts/check_frontend_integration.py para criar um backend isolado.')
}
const nativeFetch = globalThis.fetch
globalThis.fetch = (path, options) => {
  assert.ok(path.startsWith('/api/'))
  return nativeFetch(base + path, options)
}

test('cliente do frontend com FastAPI, SQLite temporário e geração local', async t => {
  let analysis, chat, draft, strategy
  await t.test('lista, paginação, filtros e documentos reais do dataset', async () => {
    const first = await fetchCases({ page: 1, pageSize: 1 })
    const second = await fetchCases({ page: 2, pageSize: 1 })
    assert.equal(first.total, 2)
    assert.equal(first.totalPages, 2)
    assert.notEqual(first.data[0].id, second.data[0].id)
    const filtered = await fetchCases({ uf: 'AM', status: 'PENDENTE' })
    assert.equal(filtered.total, 1)
    const { data } = await fetchCaseById(1)
    assert.equal(data.defendant, 'BANCO UFMG S.A.')
    assert.equal(data.documents.length, 7)
    const document = await fetchDocument(1, data.documents[0].id)
    assert.equal(document.pages.length, data.documents[0].page_count)
    assert.equal((await fetchAnalysis(1)).status, 'not_found')
    assert.equal((await fetchChats(1)).total, 0)
    assert.equal((await fetchDrafts(1)).total, 0)
  })
  await t.test('análise salva, cenários e política indisponível explícita', async () => {
    analysis = await analyzeCase(1)
    assert.equal(analysis.generation_mode, 'local')
    assert.equal(analysis.policy, null)
    assert.ok(analysis.sources.length)
    const stored = await fetchAnalysis(1)
    assert.equal(stored.status, 'available')
    assert.equal(stored.analysis.analysis_id, analysis.analysis_id)
    assert.ok(stored.analysis.author_arguments.length)
    assert.ok(stored.analysis.defense_arguments.length)
    const triage = await fetchCases({ includeAnalysis: true })
    assert.equal(triage.data.find(item => item.id === 1).analysisStatus, 'available')
    assert.equal(triage.data.find(item => item.id === 1).recommendation, null)
    const scenarios = await generateScenarios(1)
    assert.ok(scenarios.author_arguments.length)
    assert.ok(scenarios.defense_arguments.length)
    assert.equal(scenarios.generation_mode, 'local')
    assert.equal((await negotiate(1, 2500)).status, 'SEM_POLITICA')
  })
  await t.test('chat mantém sessão e recupera histórico sem outra geração', async () => {
    chat = await sendChat(1, 'Quais documentos sustentam o contrato?')
    const second = await sendChat(1, 'Quais lacunas precisam de revisão?', chat.session_id)
    assert.equal(second.session_id, chat.session_id)
    const sessions = await fetchChats(1)
    assert.equal(sessions.total, 1)
    const history = await fetchChat(1, chat.session_id)
    assert.equal(history.messages.length, 4)
    assert.equal(history.messages.at(-1).content, second.answer)
    await assert.rejects(fetchChat(2, chat.session_id), error => error.status === 404)
  })
  await t.test('encaminhamento salvo liga o parecer à minuta e ao PDF revisado', async () => {
    assert.equal((await fetchStrategy(1)).status, 'not_found')
    draft = await prepareDraft({ request: { case_id: 1, analysis_id: analysis.analysis_id, expected_case_version: 0,
      action: 'DEFESA', settlement_amount: null, rationale: 'Desenvolver as respostas com as fontes conferidas.' } })
    strategy = (await fetchStrategy(1)).strategy
    assert.equal(draft.analysis_id, analysis.analysis_id)
    assert.deepEqual(draft.strategy, strategy)
    assert.equal(draft.status, 'review_required')
    assert.equal((await fetchDrafts(1)).items[0].draft_id, draft.draft_id)
    const saved = await fetchDraft(draft.draft_id)
    assert.equal(saved.content_markdown, draft.content_markdown)
    const pdf = await exportDraft(draft.draft_id, '# Revisao de integracao\n\nMARCADOR QA FRONTEND 2026')
    assert.equal(pdf.blob.type, 'application/pdf')
    const bytes = Buffer.from(await pdf.blob.arrayBuffer())
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-')
    await writeFile(process.env.SUITS_TEST_PDF_PATH, bytes)
    assert.equal((await fetchDraft(draft.draft_id)).content_markdown, draft.content_markdown)
  })
  await t.test('minuta de acordo, formato de mensagem e erros de validação', async () => {
    const agreement = await generateDraft(2, { action: 'ACORDO', settlement_amount: 2500.5, format: 'whatsapp' })
    assert.ok(agreement.content_markdown)
    await assert.rejects(generateDraft(2, { action: 'ACORDO', settlement_amount: -1 }), error => error.status === 422)
    await assert.rejects(fetchCaseById(99999), error => error.status === 404)
  })
  await t.test('históricos paginam além da primeira página', async () => {
    for (let i = 0; i < 20; i++) await generateDraft(2, { action: 'DEFESA' })
    const first = await fetchDrafts(2)
    const second = await fetchDrafts(2, 20)
    assert.equal(first.total, 21)
    assert.equal(first.items.length, 20)
    assert.equal(first.has_more, true)
    assert.equal(second.items.length, 1)
    assert.equal(second.has_more, false)
    assert.ok(!first.items.some(item => item.draft_id === second.items[0].draft_id))
  })
  await t.test('decisão mantém versão e idempotência, rejeita concorrência e torna parecer histórico', async () => {
    const body = { case_id: 1, action: 'DEFESA', settlement_amount: null, lawyer_id: 'qa-adv', law_firm_id: 'qa-firm', expected_case_version: 0, analysis_id: analysis.analysis_id, override_reason: strategy.rationale, draft_id: draft.draft_id, reviewed_content_markdown: '# Revisao de integracao\n\nMARCADOR QA FRONTEND 2026', idempotency_key: crypto.randomUUID() }
    const result = await recordDecision(body)
    assert.equal(result.case_version, 1)
    assert.equal(result.is_override, null)
    assert.equal((await recordDecision(body)).decision_id, result.decision_id)
    await assert.rejects(recordDecision({ ...body, idempotency_key: crypto.randomUUID() }), error => error.status === 409)
    assert.equal((await fetchCaseById(1)).data.status, 'CONCLUIDO')
    assert.equal((await fetchAnalysis(1)).status, 'stale')
    assert.equal((await fetchDecisions(1)).total, 1)
    assert.equal((await fetchCases({ status: 'CONCLUIDO' })).total, 1)
    assert.equal((await fetchCases({ status: 'CONCLUIDO', includeAnalysis: true })).data[0].recommendation, 'DEFESA')
    const record = (await fetchDecisions(1)).items[0]
    assert.equal(record.analysis.analysis_id, analysis.analysis_id)
    assert.equal(record.registration.reviewed_content_markdown, body.reviewed_content_markdown)
    assert.equal(record.registration.draft_id, draft.draft_id)
    assert.equal((await fetchStrategy(1)).status, 'stale')
  })
  await t.test('governança reflete decisões e inventário sem inventar indicadores', async () => {
    const overview = await requestJson('/api/monitoring/overview')
    assert.equal(overview.active_lawyers_count, 1)
    assert.equal(overview.partner_law_firms_count, 1)
    assert.equal(overview.adherence_rate, null)
    assert.equal((await requestJson('/api/monitoring/subsidies')).missing_by_type.has_contract, 1)
    assert.equal((await requestJson('/api/monitoring/adherence')).status, 'pending_integration')
  })
})
