import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStoredAnalysis, currentAnalysis, decisionAttempt, parseAmount, policyScore, requiresOverride } from './workflow.js'

test('parecer histórico, de outro caso ou versão não define a política atual', () => {
  const caseData = { id: 2, version: 3 }
  const analysis = { case_id: 2, case_version: 3, analysis_id: 'analysis' }
  assert.equal(currentAnalysis({ status: 'available', analysis }, caseData), analysis)
  assert.equal(currentAnalysis({ status: 'stale', analysis }, caseData), null)
  assert.equal(currentAnalysis({ status: 'available', analysis: { ...analysis, case_id: 1 } }, caseData), null)
  assert.equal(currentAnalysis({ status: 'available', analysis: { ...analysis, case_version: 2 } }, caseData), null)
  assert.equal(currentAnalysis({ status: 'not_found', analysis: null }, caseData), null)
})
test('score só recebe o rótulo de derrota quando o produtor declara esse significado', () => {
  assert.equal(policyScore({ confidence_score: .8, confidence_score_semantics: 'loss_probability' }).label, 'Probabilidade de derrota')
  assert.equal(policyScore({ confidence_score: .8, confidence_score_semantics: 'recommendation_confidence' }).label, 'Confiança na recomendação')
  assert.match(policyScore({ confidence_score: .8 }).label, /semântica não informada/)
  assert.equal(policyScore({ confidence_score: .8 }).value, .8)
  assert.equal(policyScore(null), null)
})
test('triagem usa política salva atual e não reaproveita valores históricos', () => {
  const caseData = { id: 2, recommendation: null }
  const analysis = { case_id: 2, case_version: 0, policy: { recommendation: 'ACORDO', confidence_score: .8, confidence_score_semantics: 'recommendation_confidence', risk_level: 'ALTO', settlement_pricing: { expected_loss: 1000 } } }
  const envelope = { status: 'available', case_version: 0, analysis }
  const result = applyStoredAnalysis(caseData, envelope)
  assert.equal(result.recommendation, 'ACORDO')
  assert.equal(result.expectedLoss, 1000)
  assert.equal(result.lossProbability, null)
  assert.equal(applyStoredAnalysis(result, { ...envelope, status: 'stale', case_version: 1 }).recommendation, null)
})
test('valor monetário aceita vírgula ou ponto decimal e recusa valores ambíguos', () => {
  for (const input of ['2500,50', '2500.50', ' 2500.5 ']) assert.equal(parseAmount(input), 2500.5)
  for (const input of ['0', '-1', '1.234', '2.500,00', 'NaN', '', 'Infinity', '1e3', '1000000000001']) assert.throws(() => parseAmount(input), /valor positivo/)
})
test('decisão divergente ou acima do teto exige justificativa sem inventar política', () => {
  const policy = { recommendation: 'ACORDO', settlement_pricing: { ceiling: 5000 } }
  assert.equal(requiresOverride(policy, 'ACORDO', 5000), false)
  assert.equal(requiresOverride(policy, 'ACORDO', 5000.01), true)
  assert.equal(requiresOverride(policy, 'DEFESA', null), true)
  assert.equal(requiresOverride(null, 'DEFESA', null), false)
})
test('repetição preserva chave e corpo; alteração cria outra tentativa', () => {
  let ids = 0
  const nextId = () => 'key-' + ++ids
  const body = { case_id: 2, action: 'ACORDO', settlement_amount: 2500, expected_case_version: 0, analysis_id: 'analysis' }
  const first = decisionAttempt(null, body, nextId)
  const retry = decisionAttempt(JSON.parse(JSON.stringify(first)), { ...body }, nextId)
  assert.deepEqual(retry, first)
  assert.equal(ids, 1)
  const edited = decisionAttempt(retry, { ...body, settlement_amount: 2600 }, nextId)
  assert.notEqual(edited.body.idempotency_key, first.body.idempotency_key)
  const refreshed = decisionAttempt(first, { ...body, expected_case_version: 1 }, nextId)
  assert.notEqual(refreshed.body.idempotency_key, first.body.idempotency_key)
})
