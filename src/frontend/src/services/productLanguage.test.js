import test from 'node:test'
import assert from 'node:assert/strict'
import { errorDetail, policyRule, reasonLabel, systemText } from './productLanguage.js'
import { fetchCases, recordDecision } from './api.js'

test('502 ao listar processos informa indisponibilidade, sem confundir com geração', async t => {
  const mock = t.mock.method(globalThis, 'fetch', async () => new Response('Bad Gateway', { status: 502 }))
  await assert.rejects(fetchCases(), error => {
    assert.equal(error.status, 502)
    assert.match(error.message, /Não foi possível carregar os dados/)
    assert.doesNotMatch(error.message, /geração|histórico|backend|API/)
    return true
  })
  await assert.rejects(recordDecision({}), /Consulte o histórico/)
  assert.equal(mock.mock.callCount(), 2)
})

test('validação traduz nomes de campos e mensagens em inglês sem expor dados internos', () => {
  const result = errorDetail([
    { loc: ['body', 'settlement_amount'], type: 'greater_than', ctx: { gt: 0 }, msg: 'Input should be greater than 0' },
    { loc: ['body', 'override_reason'], type: 'string_too_short', ctx: { min_length: 5 } },
    { loc: ['query', 'undocumented_field'], msg: 'Internal parser error' },
  ], 422)
  assert.match(result, /Valor do acordo: Informe um valor maior que zero/)
  assert.match(result, /Justificativa: Informe pelo menos 5 caracteres/)
  assert.match(result, /Dados informados: Valor inválido/)
  assert.doesNotMatch(result, /settlement_amount|override_reason|undocumented_field|Input|parser/)
  assert.match(errorDetail([{ loc: ['body'], type: 'value_error', msg: 'Value error, Informe settlement_amount positivo para acordo.' }], 422), /valor de acordo maior que zero/)
  assert.match(errorDetail('Informe override_reason para divergir da política ou exceder o teto.', 422), /justificativa/)
})

test('erros desconhecidos não mostram exceções e conflitos mantêm orientação de atualização', () => {
  assert.doesNotMatch(errorDetail('Traceback: API BackendException', 500), /Traceback|API|BackendException/)
  assert.match(errorDetail('Chave de idempotência já usada com outros dados.', 409), /Atualize o processo/)
  assert.match(errorDetail('A IA retornou uma referência que não consta do contexto.', 502), /conferir uma das fontes/)
})

test('avisos antigos e regras mantêm limitações e valores com linguagem jurídica', () => {
  const warning = systemText('B1 não declara a semântica de confidence_score; não apresentar como probabilidade de derrota.')
  assert.match(warning, /não deve ser usado como probabilidade de derrota/)
  assert.doesNotMatch(warning, /B1|confidence_score|semântica/)
  const rule = policyRule('⚠️ Fallback estatístico ativado (FileNotFoundError: model.pkl): probabilidade estimada em 81.2%.')
  assert.match(rule, /81.2%/)
  assert.doesNotMatch(rule, /Fallback|FileNotFoundError|model.pkl/)
  assert.equal(reasonLabel('ML_ZONA_CINZENTA'), 'Avaliação jurimétrica do conjunto documental')
  assert.equal(systemText('Documento ausente: contrato nº 123.'), 'Documento ausente: contrato nº 123.')
})
