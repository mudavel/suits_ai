import test from 'node:test'
import assert from 'node:assert/strict'
import { compactPolicyExplanation, policyExplanation, readablePolicyText } from './policyExplanation.js'

const assessment = policy => ({ policy_status: 'available', policy })

test('fundamentação completa fica em um parágrafo, sem repetir três grupos de motivos', () => {
  const output = compactPolicyExplanation(assessment({ recommendation: 'DEFESA', reasoning_code: 'CADEIA_COMPLETA',
    decision_path: ['O caso conta com contrato, extrato ou TED e comprovante de crédito.'],
    forest_consensus_reasons: ['A cadeia documental está completa.'],
    applied_rules: ['Histórico de amortização/descontos regulares demonstra conhecimento e usufruto prévio da operação.'],
  }))
  assert.equal(output.paragraphs.length, 1)
  assert.equal(output.paragraphs[0].match(/contrato/g).length, 1)
  assert.match(output.paragraphs[0], /demonstrativo de evolução da dívida/)
  assert.match(output.note, /não de uma previsão estatística/)
})

test('resumo estatístico preserva probabilidade e limite efetivamente registrados', () => {
  const output = compactPolicyExplanation(assessment({ recommendation: 'ACORDO', reasoning_code: 'ML_ZONA_CINZENTA',
    plain_language_explanation: 'O Random Forest estimou risco de derrota em 43,7%. Os fatores que mais se repetiram entre as árvores representativas foram: contrato ausente.',
    decision_path: ['Contrato ausente.', 'Contrato ausente.', 'Extrato disponível.'],
    applied_rules: ['Risco de condenação (43.7%) supera a tolerância de contencioso (40%). Proposta de acordo recomendada.'],
  }))
  assert.match(output.paragraphs.join(' '), /43,7%/)
  assert.match(output.paragraphs.join(' '), /40%/)
  assert.equal(output.paragraphs.join(' ').match(/Contrato ausente/g).length, 1)
  assert.doesNotMatch(output.paragraphs.join(' '), /fatores que mais se repetiram/)
})

test('usa somente fundamentos salvos e preserva ordem, recomendação e valores', () => {
  const policy = {
    recommendation: 'ACORDO', reasoning_code: 'ML_ZONA_CINZENTA',
    plain_language_explanation: 'O Random Forest estimou risco de derrota em 43,7%.',
    decision_path: ['Ausência de contrato.', 'Valor da causa acima de R$ 15.420,75.'],
    forest_consensus_reasons: ['Ausência de comprovante de crédito.'],
    applied_rules: ['Risco estimado de 43,7%; limite de acordo de 40%.'],
  }
  const original = structuredClone(policy)
  const explanation = policyExplanation(assessment(policy))
  assert.equal(explanation.recommendation, 'Acordo')
  assert.deepEqual(explanation.path, policy.decision_path)
  assert.deepEqual(explanation.factors, policy.forest_consensus_reasons)
  assert.deepEqual(explanation.rules, policy.applied_rules)
  assert.match(explanation.origin, /estatística/)
  assert.match(explanation.summary, /43,7%/)
  assert.deepEqual(policy, original)
})

test('regra documental não é apresentada como avaliação estatística nem consenso de árvores', () => {
  const explanation = policyExplanation(assessment({ recommendation: 'DEFESA', reasoning_code: 'CADEIA_COMPLETA',
    decision_path: ['O caso conta com contrato, extrato ou TED e comprovante de crédito.'],
    forest_consensus_reasons: ['O principal fator favorável foi a presença da cadeia documental completa.'],
  }))
  assert.equal(explanation.recommendation, 'Defesa')
  assert.match(explanation.originNote, /sem necessidade de avaliação estatística/)
  assert.equal(explanation.factorsTitle, 'Fatores determinantes da recomendação')
  assert.equal(explanation.path.length, 1)
})

test('não transforma confiança de 95% em taxa de êxito nem exibe 95,9% fixos como previsão', () => {
  const explanation = policyExplanation(assessment({ recommendation: 'DEFESA', reasoning_code: 'CADEIA_COMPLETA',
    confidence_score: .95, confidence_score_semantics: 'recommendation_confidence',
    applied_rules: ['Taxa histórica de êxito no tribunal superior a 95.9% para este perfil probatório.',
      'Art. 373, II, CPC atendido integralmente: Fato impeditivo/modificativo do direito do autor comprovado.'],
  }))
  assert.doesNotMatch(JSON.stringify(explanation), /95|atendido integralmente/)
  assert.match(explanation.rules[0], /não comprova o atendimento do ônus da prova/)
})

test('não autentica contrato, titularidade ou usufruto a partir da presença documental', () => {
  for (const statement of [
    'O modelo encontrou contrato ou biometria válida, o que favorece a defesa.',
    'O modelo encontrou extrato ou TED em nome do cliente, o que ajuda a sustentar a contratação.',
    'Histórico de amortização/descontos regulares demonstra conhecimento e usufruto prévio da operação.',
  ]) {
    const text = readablePolicyText(statement)
    assert.doesNotMatch(text, /biometria válida|em nome do cliente|demonstra conhecimento e usufruto/)
    assert.match(text, /informad|conferid/)
  }
})

test('falha ou ausência do modelo fica explícita, sem inventar trilha ou mostrar erro técnico', () => {
  const explanation = policyExplanation(assessment({ recommendation: 'ACORDO', reasoning_code: 'ML_ZONA_CINZENTA',
    plain_language_explanation: 'A recomendação foi construída por estimativa de contingência, porque o artefato do Random Forest não estava acessível.',
    applied_rules: ['Fallback estatístico ativado (RuntimeError secret/path/file.pkl): probabilidade estimada em 50.0%.'],
  }))
  assert.match(explanation.origin, /alternativa/)
  assert.deepEqual(explanation.path, [])
  assert.deepEqual(explanation.factors, [])
  assert.doesNotMatch(JSON.stringify(explanation), /RuntimeError|secret|\.pkl|Fallback|artefato|Random Forest/)
  assert.match(explanation.rules[0], /50.0%/)
})

test('resultado sem detalhamento não recebe explicação genérica fabricada', () => {
  assert.equal(policyExplanation({ policy: null }), null)
  const explanation = policyExplanation(assessment({ recommendation: 'DEFESA', reasoning_code: 'ML_ZONA_CINZENTA' }))
  assert.equal(explanation.summary, null)
  assert.deepEqual(explanation.path, [])
  assert.deepEqual(explanation.factors, [])
  assert.deepEqual(explanation.rules, [])
  assert.match(explanation.originNote, /não permite confirmar/)
})

test('demonstração permanece identificada mesmo quando contém narrativa de modelo', () => {
  const explanation = policyExplanation({ policy_status: 'mock', policy: {
    recommendation: 'ACORDO', reasoning_code: 'ML_ZONA_CINZENTA',
    plain_language_explanation: 'O Random Forest estimou risco de derrota em 60%.',
  } })
  assert.equal(explanation.origin, 'Resultado demonstrativo')
  assert.match(explanation.originNote, /não é uma avaliação real/)
})

test('retira termos técnicos sem alterar a UF, os valores ou o limite de decisão', () => {
  const text = readablePolicyText('Classificador Random Forest Calibrado estimou probabilidade de derrota em 40.0% para a comarca (BA).')
  assert.equal(text, 'A avaliação estatística estimou probabilidade de derrota em 40.0% considerando a UF BA.')
  assert.match(readablePolicyText('Risco de condenação (40.0%) supera a tolerância de contencioso (40%).'), /atinge ou supera/)
})
