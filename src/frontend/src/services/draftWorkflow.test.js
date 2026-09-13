import test from 'node:test'
import assert from 'node:assert/strict'
import { prepareDraft } from './draftWorkflow.js'

const request = { case_id: 2, analysis_id: 'analysis-current', expected_case_version: 4,
  action: 'ACORDO', settlement_amount: 2500.5, rationale: 'Conferir a contratação.' }
const strategy = { ...request, strategy_id: 'strategy-saved' }

test('um comando salva encaminhamento e gera a minuta vinculada, nesta ordem', async t => {
  const calls = [], phases = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push([url, JSON.parse(options.body)])
    return Response.json(url === '/api/strategy' ? strategy : { draft_id: 'draft-new', strategy })
  })
  const draft = await prepareDraft({ request, onPhase: phase => phases.push(phase) })
  assert.deepEqual(calls, [['/api/strategy', request], ['/api/generate-draft', {
    case_id: 2, strategy_id: strategy.strategy_id, action: 'ACORDO', format: 'formal', settlement_amount: 2500.5,
  }]])
  assert.deepEqual(phases, ['saving', 'generating'])
  assert.equal(draft.draft_id, 'draft-new')
})

test('encaminhamento já salvo é reutilizado sem criar outra versão', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async url => { calls.push(url); return Response.json({ draft_id: 'retry' }) })
  await prepareDraft({ strategy })
  assert.deepEqual(calls, ['/api/generate-draft'])
})

test('erro de validação ou conflito ao salvar impede a geração', async t => {
  for (const status of [422, 409]) {
    const calls = []
    const mock = t.mock.method(globalThis, 'fetch', async url => {
      calls.push(url)
      return Response.json({ detail: 'Justifique o encaminhamento que diverge da recomendação ou supera o teto.' }, { status })
    })
    await assert.rejects(prepareDraft({ request }), error => error.status === status)
    assert.deepEqual(calls, ['/api/strategy'])
    mock.mock.restore()
  }
})

test('falha após salvar orienta recuperação sem repetir gravação nem geração', async t => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async url => {
    calls.push(url)
    if (url === '/api/strategy') return Response.json(strategy)
    throw new TypeError('network failed')
  })
  await assert.rejects(prepareDraft({ request }), /encaminhamento está salvo.*Consulte o histórico/)
  assert.deepEqual(calls, ['/api/strategy', '/api/generate-draft'])
})

test('sem encaminhamento não envia requisições', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => assert.fail('Não deve enviar'))
  await assert.rejects(prepareDraft({}), /Defina o encaminhamento/)
  assert.equal(fetch.mock.callCount(), 0)
})
