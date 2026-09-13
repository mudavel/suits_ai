import test from 'node:test'
import assert from 'node:assert/strict'
import { caseAssessment } from './caseAssessment.js'

const caseData = { claimant: 'Maria', defendant: 'Banco Exemplo', caseNumber: '123', court: '3ª Vara Cível',
  claimValue: 20000, reasoningDescription: 'Contratação contestada', documents: [{ document_type: 'CONTRATO' }],
  claims: ['A autora relata descontos em seu benefício.'] }

test('exibe o parecer redigido, não os diagnósticos de extração', () => {
  const explanation = 'Maria ajuizou ação contra Banco Exemplo e pede a cessação dos descontos.\n\nO contrato registra operação de R$ 5.000,00.'
  const output = caseAssessment(caseData, { generation_mode: 'openai', explanation,
    document_checks: [{ message: 'CPF: 3 valores extraídos de documentos.' }], warnings: ['Detalhe técnico.'] })
  assert.equal(output.text, explanation)
  assert.equal(output.generated, true)
  assert.doesNotMatch(output.text, /valores extraídos|Detalhe técnico/)
})

test('parecer anterior em tópicos vira síntese contextual em parágrafos sem alterar o registro', () => {
  const analysis = { generation_mode: 'openai', explanation: '### Controvérsias para o banco\n- A autora nega a contratação.\n- Outra controvérsia.\n\n### Elementos disponíveis\n- O contrato prevê 72 parcelas de R$ 120,00.\n- O extrato registra crédito de R$ 5.000,00.\n- Terceiro elemento.\n\n### Pendências do banco\n- Falta a gravação da contratação.\n- Outra pendência.' }
  const before = structuredClone(analysis)
  const output = caseAssessment(caseData, analysis)
  assert.match(output.text, /Maria ajuizou ação em face de Banco Exemplo/)
  assert.match(output.text, /3ª Vara Cível/)
  assert.match(output.text, /20\.000,00/)
  assert.match(output.text, /72 parcelas de R\$ 120,00/)
  assert.match(output.text, /5\.000,00/)
  assert.match(output.text, /Falta a gravação/)
  assert.doesNotMatch(output.text, /###|Elementos disponíveis|Outra controvérsia/)
  assert.match(output.text, /Terceiro elemento/)
  assert.deepEqual(analysis, before)
})

test('parecer local resume cadastro e material, sem simular redação por IA', () => {
  const output = caseAssessment(caseData, { generation_mode: 'local', explanation: 'Revisão documental local. CPF extraído.' })
  assert.match(output.text, /descontos em seu benefício/)
  assert.match(output.text, /inclui contrato/)
  assert.doesNotMatch(output.text, /CPF extraído|Pedido de danos morais/)
  assert.equal(output.generated, false)
})

test('não mistura cadastro atual com fundamentação de parecer desatualizado', () => {
  const output = caseAssessment(caseData, { generation_mode: 'openai', explanation: '### Controvérsias\n- Fato histórico.' }, false)
  assert.equal(output.text, 'Fato histórico.')
  assert.doesNotMatch(output.text, /Maria|20\.000/)
})

test('ausência de informação não vira declaração de fato ou pedido inventado', () => {
  const output = caseAssessment({}, { generation_mode: 'local' })
  assert.doesNotMatch(output.text, /undefined|null|danos morais|R\$/)
  assert.match(output.text, /Não há subsídios bancários identificados/)
})
