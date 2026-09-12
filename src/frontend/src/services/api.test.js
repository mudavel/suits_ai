import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchCases, fetchCaseById, mapCase } from './api.js'

const caseItem = {
  id: 2, case_number: '0654321-09.2024.8.04.0001',
  title: 'JOSÉ RAIMUNDO OLIVEIRA COSTA x BANCO UFMG S.A.',
  claimant_name: 'JOSÉ RAIMUNDO OLIVEIRA COSTA', defendant_name: 'BANCO UFMG S.A.',
  cause_value: 25000, uf: 'AM', status: 'PENDENTE',
  recommendation: null, risk_level: null, data_mode: 'artifacts', is_simulated: true,
  subsidies: { has_contract: false, has_statement: false, has_credit_receipt: true },
}

test('preserva as partes, o valor, a simulação e a ausência de política', () => {
  const result = mapCase(caseItem)
  assert.equal(result.claimant, caseItem.claimant_name)
  assert.equal(result.defendant, caseItem.defendant_name)
  assert.equal(result.claimValue, 25000)
  assert.equal(result.isSimulated, true)
  assert.equal(result.recommendation, null)
  assert.equal(result.settlementPricing, null)
  assert.equal(result.expectedLoss, null)
  assert.equal(result.subsidies.contract.ok, false)
})

test('o resumo usa o título da API, sem inventar nomes ou probabilidade', () => {
  const { claimant_name: _claimant, defendant_name: _defendant, is_simulated: _simulated, ...summary } = caseItem
  const result = mapCase({ ...summary, confidence_score: .95 })
  assert.equal(result.claimant, summary.title)
  assert.equal(result.defendant, null)
  assert.equal(result.isSimulated, null)
  assert.equal(result.lossProbability, null)
})

test('consome items do envelope e preserva a informação de paginação', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/cases')
    assert.equal(options.method, undefined)
    return Response.json({ items: [caseItem], total: 21, page: 1, total_pages: 2, data_mode: 'artifacts' })
  })
  const result = await fetchCases()
  assert.equal(result.data.length, 1)
  assert.equal(result.data[0].id, 2)
  assert.equal(result.total, 21)
  assert.equal(result.totalPages, 2)
  assert.equal(result.isMock, false)
})

test('aceita uma lista vazia e recusa envelope inválido', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => Response.json({ items: [], total: 0, page: 1, total_pages: 0, data_mode: 'artifacts' }))
  assert.deepEqual((await fetchCases()).data, [])
  mock.mock.mockImplementation(async () => Response.json({ items: null }))
  await assert.rejects(fetchCases(), /lista de processos/)
})

test('404 do caso não é substituído por um caso fictício', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    assert.equal(url, '/api/cases/99')
    return Response.json({ detail: 'Caso não encontrado' }, { status: 404 })
  })
  await assert.rejects(fetchCaseById(99), error => error.status === 404)
})

test('falha de conexão é propagada sem fallback para os mocks', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network unavailable') })
  await assert.rejects(fetchCases(), /Não foi possível acessar a plataforma/)
})

test('identificadores inválidos não disparam requisição', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('unexpected request') })
  await assert.rejects(fetchCaseById('../1'), /Caso não encontrado/)
  assert.equal(mock.mock.callCount(), 0)
})
