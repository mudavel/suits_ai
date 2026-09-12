import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCase, documentUrl, exportDraft, fetchCases, fetchAnalysis, fetchChat, fetchChats, fetchDraft, fetchDrafts, fetchDecisions, generateDraft, generateScenarios, negotiate, recordDecision, requestJson, sendChat } from './api.js'

test('paginação e filtros são enviados à API sem filtros de apresentação', async t => {
  t.mock.method(globalThis, 'fetch', async (url) => {
    assert.equal(url, '/api/cases?page=2&page_size=10&status=CONCLUIDO&uf=AM')
    return Response.json({ items: [], total: 0, page: 2, page_size: 10, total_pages: 0 })
  })
  await fetchCases({ page: 2, pageSize: 10, status: 'CONCLUIDO', uf: 'AM' })
})
test('abrir histórico somente consulta os endpoints vinculados ao caso', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.method, undefined)
    calls.push(url)
    return Response.json({ items: [] })
  })
  await fetchAnalysis(2)
  await fetchChats(2, 20)
  await fetchChat(2, 'session-id')
  await fetchDrafts(2, 40)
  await fetchDraft('draft-id')
  await fetchDecisions(2, 20)
  assert.deepEqual(calls, ['/api/cases/2/analysis', '/api/cases/2/chats?limit=20&offset=20', '/api/cases/2/chat/session-id', '/api/cases/2/drafts?limit=20&offset=40', '/api/drafts/draft-id', '/api/decisions?case_id=2&limit=20&offset=20'])
})
test('triagem consulta pareceres salvos e identifica falha parcial sem gerar análise', async t => {
  const paths = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.method, undefined)
    paths.push(url)
    if (url === '/api/cases') return Response.json({ items: [{ id: 1 }, { id: 2 }], total: 2, page: 1, total_pages: 1 })
    if (url === '/api/cases/1/analysis') return Response.json({ case_version: 0, status: 'available', analysis: { case_id: 1, case_version: 0, policy: { recommendation: 'DEFESA', risk_level: 'BAIXO' } } })
    return Response.json({ detail: 'Falha temporária' }, { status: 503 })
  })
  const result = await fetchCases({ includeAnalysis: true })
  assert.equal(result.data[0].recommendation, 'DEFESA')
  assert.equal(result.data[1].analysisError, true)
  assert.equal(result.data[1].recommendation, null)
  assert.equal(paths.length, 3)
})
test('fluxos enviam JSON e preservam sessão, valor, formato, versão e idempotência', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['Content-Type'], 'application/json')
    calls.push([url, JSON.parse(options.body)])
    return Response.json({})
  })
  await analyzeCase('2')
  await generateScenarios(2)
  await sendChat(2, 'Contrato?', 'session-id')
  await generateDraft(2, { action: 'ACORDO', settlement_amount: 2500.5, format: 'whatsapp' })
  await negotiate(2, 2500.5)
  const decision = { case_id: 2, action: 'ACORDO', settlement_amount: 2500.5, expected_case_version: 3, analysis_id: 'analysis-id', idempotency_key: 'key', lawyer_id: 'adv', law_firm_id: 'firm', override_reason: 'Justificativa' }
  await recordDecision(decision)
  assert.deepEqual(calls, [
    ['/api/analyze', { case_id: 2 }], ['/api/scenarios', { case_id: 2 }],
    ['/api/chat', { case_id: 2, message: 'Contrato?', session_id: 'session-id' }],
    ['/api/generate-draft', { case_id: 2, action: 'ACORDO', settlement_amount: 2500.5, format: 'whatsapp' }],
    ['/api/negotiation-copilot', { case_id: 2, proposed_amount: 2500.5 }], ['/api/decisions', decision],
  ])
})
test('PDF usa a edição do usuário e retorna o arquivo binário', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/export-pdf')
    assert.deepEqual(JSON.parse(options.body), { draft_id: 'draft', format: 'pdf', content_markdown: 'Texto revisado' })
    return new Response('%PDF-example', { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="minuta.pdf"' } })
  })
  const result = await exportDraft('draft', 'Texto revisado')
  assert.equal(result.blob.type, 'application/pdf')
  assert.equal(await result.blob.text(), '%PDF-example')
})
test('erros 422 preservam campos e 409 preserva status para bloquear decisão', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: [{ loc: ['body', 'settlement_amount'], msg: 'Valor inválido' }] }, { status: 422 }))
  await assert.rejects(generateDraft(2, {}), error => error.status === 422 && /Valor do acordo: Valor inválido/.test(error.message))
  mock.mock.mockImplementation(async () => Response.json({ detail: 'Caso já concluído' }, { status: 409 }))
  await assert.rejects(recordDecision({}), error => error.status === 409 && error.message === 'Caso já concluído')
  assert.equal(mock.mock.callCount(), 2)
})
test('falha de geração não faz retry automático nem troca por conteúdo local', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ detail: 'Resposta incompleta' }, { status: 502 }))
  await assert.rejects(sendChat(2, 'Pergunta'), error => error.status === 502)
  assert.equal(mock.mock.callCount(), 1)
})
test('timeout de gravação informa resultado incerto e não reenvia', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
  await assert.rejects(requestJson('/api/decisions', { body: {}, timeoutMs: 5 }), /pode ter sido salva/)
  assert.equal(mock.mock.callCount(), 1)
})
test('cancelamento de consulta propaga AbortError e fontes apontam ao PDF do caso', async t => {
  const controller = new AbortController()
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))))
  const result = fetchCases({ signal: controller.signal })
  controller.abort()
  await assert.rejects(result, error => error.name === 'AbortError')
  assert.equal(documentUrl(2, 'doc/name', 3), '/api/cases/2/documents/doc%2Fname/download#page=3')
})
