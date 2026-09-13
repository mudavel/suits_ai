// Presentation only: use the saved evaluation, never infer a new decision from today's documents.
// Older evaluations contain assertions that document-presence flags alone cannot establish.
const qualifiedStatements = new Map([
  ['Força Probatória Plena: Contrato Assinado (CCB) + Comprovante de TED + Registro BACEN localizados.', 'A política identificou os três documentos essenciais como disponíveis: contrato, extrato e comprovante de crédito.'],
  ['Histórico de amortização/descontos regulares demonstra conhecimento e usufruto prévio da operação.', 'O demonstrativo de evolução da dívida foi informado como disponível. Seu conteúdo deve ser conferido antes de sustentar conhecimento ou utilização do crédito.'],
  ['Art. 373, II, CPC atendido integralmente: Fato impeditivo/modificativo do direito do autor comprovado.', 'Cabe conferir se o conteúdo dos documentos responde às alegações do autor e sustenta os fatos invocados pelo banco. A disponibilidade documental, isoladamente, não comprova o atendimento do ônus da prova.'],
  ['Taxa histórica de êxito no tribunal superior a 95.9% para este perfil probatório.', null],
  ['Probabilidade histórica de derrota superior a 81% (podendo atingir 98.6% sem contrato e extrato).', null],
  ['Aplicação do art. 6º, VIII do CDC: Inversão do ônus da prova tornará a condenação quase certa.', 'A insuficiência documental é o fundamento da recomendação de acordo. A distribuição do ônus da prova e o desfecho dependem da apreciação judicial.'],
  ['Esse conjunto mostra origem da contratação, liberação do valor e vínculo com a operação discutida.', 'Esse conjunto reúne documentos a examinar para demonstrar a contratação, a liberação do valor e o vínculo com a operação discutida.'],
  ['Quando disponível, o histórico da dívida reforça que houve acompanhamento ou utilização do crédito.', 'Se houver histórico da dívida, cabe verificar se ele efetivamente demonstra acompanhamento ou utilização do crédito.'],
  ['Com essa base documental, a defesa fica tecnicamente sustentada.', 'A disponibilidade desse conjunto levou a política a recomendar defesa, sujeita à conferência de seu conteúdo.'],
  ['A contratação ficou amparada por provas materiais centrais.', 'Foram informados os documentos centrais para examinar a regularidade da contratação.'],
  ['Auditoria Probatória: Dossiê Grafotécnico/Facial atesta divergência de assinatura/biometria (Fraude Confirmada).', 'O dossiê foi classificado como não conforme na avaliação registrada. É necessário consultar a conclusão documental e a divergência nela apontada.'],
  ['Isso indica divergência relevante de assinatura, biometria ou autenticidade documental.', 'A natureza da divergência deve ser verificada no dossiê; a classificação não identifica, por si só, a ocorrência de fraude.'],
  ['Recomendação de Acordo Fast-Track para mitigar perícia judicial onerosa, condenação de danos morais majorados e multa por má-fé.', 'A não conformidade do dossiê levou a política a recomendar acordo prioritário.'],
  ['O modelo encontrou contrato ou biometria válida, o que favorece a defesa.', 'A presença informada do contrato foi um dos critérios considerados na avaliação.'],
  ['O modelo sentiu falta de contrato ou biometria válida, o que pesa contra a defesa.', 'A ausência informada do contrato foi um dos critérios considerados na avaliação.'],
  ['O modelo encontrou extrato ou TED em nome do cliente, o que ajuda a sustentar a contratação.', 'A presença informada de extrato ou comprovante de transferência foi considerada na avaliação; a titularidade deve ser conferida no documento.'],
  ['O modelo não encontrou extrato ou TED suficientemente útil, o que enfraquece a defesa.', 'A ausência informada de extrato ou comprovante de transferência foi considerada na avaliação.'],
  ['O comprovante de liberação do crédito apareceu como fator favorável à defesa.', 'A presença informada de comprovante de crédito foi considerada na avaliação.'],
  ['A ausência de comprovante de liberação do crédito pesou contra a defesa.', 'A ausência informada de comprovante de crédito foi considerada na avaliação.'],
  ['O histórico de evolução da dívida ajudou a mostrar continuidade da operação.', 'A presença informada do demonstrativo de evolução da dívida foi considerada na avaliação.'],
  ['O registro do canal de contratação ajudou a compor a narrativa probatória.', 'A presença informada de laudo referenciado foi considerada na avaliação.'],
  ['Presença de contrato ou biometria válida apareceu repetidamente como fator favorável à defesa.', 'A presença informada do contrato foi considerada repetidamente na avaliação.'],
  ['Ausência de contrato ou biometria válida apareceu repetidamente como fator de risco para a defesa.', 'A ausência informada do contrato foi considerada repetidamente na avaliação.'],
  ['Presença de extrato ou TED em nome do cliente apareceu várias vezes como apoio à defesa.', 'A presença informada de extrato ou comprovante de transferência foi considerada repetidamente na avaliação.'],
  ['Histórico da dívida e dos pagamentos reforçou a tese defensiva em parte das árvores.', 'A presença informada do demonstrativo de evolução da dívida foi considerada repetidamente na avaliação.'],
  ['Registro do canal de contratação apareceu como apoio complementar à regularidade da operação.', 'A presença informada de laudo referenciado foi considerada repetidamente na avaliação.'],
])

export function readablePolicyText(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  if (qualifiedStatements.has(value)) return qualifiedStatements.get(value)
  for (const [original, qualified] of qualifiedStatements) {
    if (qualified) value = value.replaceAll(original, qualified)
  }
  return value
    .replace(/^MOCK:\s*/i, 'Demonstração: ')
    .replace(/Fallback estatístico ativado \([\s\S]*\): probabilidade estimada em/, 'Avaliação estatística indisponível. Estimativa alternativa de risco:')
    .replace(/o artefato do Random Forest não estava acessível/g, 'a avaliação estatística não estava disponível')
    .replace(/a leitura detalhada do Random Forest falhou/g, 'a avaliação estatística não pôde ser concluída')
    .replace(/o Random Forest estimou/g, 'a avaliação estatística estimou')
    .replace(/O Random Forest estimou/g, 'A avaliação estatística estimou')
    .replace(/Classificador Random Forest Calibrado estimou/g, 'A avaliação estatística estimou')
    .replace(/Ativação do Modelo Jurimétrico Random Forest Calibrado\./g, 'A política recorreu à avaliação estatística do risco.')
    .replace(/Zona Cinzenta Probatória/g, 'Conjunto documental incompleto')
    .replace(/Estimador jurimétrico de contingência/g, 'Estimativa alternativa de risco')
    .replace(/estimativa de contingência/g, 'estimativa alternativa')
    .replace(/Acordo Fast-Track/g, 'acordo prioritário')
    .replace(/árvores representativas/g, 'avaliações selecionadas para explicar este resultado')
    .replace(/das árvores/g, 'dos critérios considerados')
    .replace(/parte das árvores/g, 'parte da avaliação')
    .replace(/ramo do modelo/g, 'grupo de casos usado na avaliação')
    .replace(/entrou no ramo/g, 'foi comparado ao grupo de casos')
    .replace(/esta trilha do modelo/g, 'esta avaliação')
    .replace(/trilha do modelo/g, 'sequência de critérios considerada')
    .replace(/a predição do modelo/g, 'a estimativa de risco')
    .replace(/para a comarca \(([A-Z]{2})\)/g, 'considerando a UF $1')
    .replace(/supera a tolerância de contencioso/g, 'atinge ou supera o limite de risco da política')
    .replace(/uma cadeia probatória consistente/g, 'um conjunto documental disponível para exame')
    .replace(/o dossiê técnico apontou indício forte de fraude/g, 'o dossiê técnico foi classificado como não conforme')
    .replace(/biometria válida/g, 'identificação biométrica a conferir')
    .replace(/Esse conjunto mostra/g, 'Esse conjunto permite examinar')
}

export function policyExplanation(analysis) {
  const policy = analysis?.policy
  if (!policy) return null
  const list = items => (Array.isArray(items) ? items : []).map(readablePolicyText).filter(Boolean)
  const recordedText = [policy.plain_language_explanation, ...(policy.applied_rules || [])].join(' ')
  const alternative = /contingência|Fallback estatístico|estimativa alternativa/i.test(recordedText)
  const simulated = analysis.policy_status === 'mock'
  const documentary = ['CADEIA_COMPLETA', 'FALHA_PROBATORIA', 'DOSSIE_NAO_CONFORME', 'POWER_PAIR_AUSENTE'].includes(policy.reasoning_code)
  const statistical = !alternative && policy.reasoning_code === 'ML_ZONA_CINZENTA'
    && /Random Forest.*estimou|modelo estimou risco/i.test(recordedText)
  return {
    recommendation: policy.recommendation === 'ACORDO' ? 'Acordo' : policy.recommendation === 'DEFESA' ? 'Defesa' : 'Não informada',
    origin: simulated ? 'Resultado demonstrativo' : alternative ? 'Estimativa alternativa — exige revisão' : documentary ? 'Critério documental aplicado ao caso' : statistical ? 'Avaliação estatística do risco deste processo' : 'Fundamentação registrada no parecer',
    originNote: simulated ? 'Este parecer utiliza dados de demonstração; não é uma avaliação real do modelo.'
      : alternative ? 'A avaliação estatística não estava disponível. Este resultado utilizou uma estimativa alternativa e não deve ser apresentado como previsão do modelo.'
        : documentary ? 'Neste caso, a recomendação decorreu de uma regra documental da política, sem necessidade de avaliação estatística complementar.'
          : statistical ? 'A sequência abaixo reúne os critérios selecionados para explicar esta avaliação. Os fatores recorrentes não comprovam, isoladamente, a validade dos documentos nem determinam o julgamento.'
            : 'O registro não permite confirmar como a avaliação foi realizada. São apresentados apenas os fundamentos que ficaram salvos.',
    summary: readablePolicyText(policy.plain_language_explanation),
    path: list(policy.decision_path),
    factors: list(policy.forest_consensus_reasons),
    rules: list(policy.applied_rules),
    factorsTitle: statistical ? 'Fatores recorrentes na avaliação' : 'Fatores determinantes da recomendação',
    qualified: (policy.applied_rules || []).some(rule => qualifiedStatements.has(rule)),
  }
}

export function compactPolicyExplanation(analysis) {
  const explanation = policyExplanation(analysis)
  if (!explanation) return null
  const policy = analysis.policy
  const paragraphs = []
  const complete = policy.reasoning_code === 'CADEIA_COMPLETA' && policy.recommendation === 'DEFESA'
    && (policy.decision_path || []).some(text => /conta com contrato, extrato ou TED e comprovante de crédito/.test(text))
  if (complete) {
    let reason = 'A política recomenda defesa porque foram localizados contrato, extrato e comprovante de crédito, os três documentos essenciais considerados nesta avaliação.'
    if ((policy.applied_rules || []).some(text => /Histórico de amortização\/descontos regulares/.test(text))) {
      reason += ' Também consta demonstrativo de evolução da dívida.'
    }
    paragraphs.push(reason)
  } else {
    const summary = explanation.summary?.split(' Os fatores que mais se repetiram')[0]
    if (summary) paragraphs.push(summary)
    const seen = new Set()
    const details = explanation.path.filter(text => {
      if (text === summary || /Por isso|Com essa base|Nesse cenário|a estratégia mais segura/i.test(text)) return false
      const key = text.toLocaleLowerCase('pt-BR').replace(/[^\p{L}\p{N}]/gu, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, policy.reasoning_code === 'ML_ZONA_CINZENTA' ? 3 : 1)
    if (details.length) paragraphs.push(details.join(' '))
    const threshold = (policy.applied_rules || []).map(rule => rule.match(/tolerância de contencioso \(([\d.,]+)%\)/)).find(Boolean)
    if (threshold && policy.reasoning_code === 'ML_ZONA_CINZENTA') {
      paragraphs.push(`O limite de risco adotado pela política para recomendar acordo nesta avaliação é de ${threshold[1]}%.`)
    }
    if (!paragraphs.length && explanation.rules.length) paragraphs.push(explanation.rules.slice(0, 2).join(' '))
    if (!paragraphs.length) paragraphs.push('O parecer salvo não contém os fundamentos detalhados da recomendação. É necessário atualizar a análise para obtê-los.')
  }
  const special = /demonstrativo|alternativa/.test(explanation.origin)
    || explanation.origin === 'Fundamentação registrada no parecer'
  return {
    ...explanation,
    paragraphs,
    note: special ? explanation.originNote : complete
      ? 'A conclusão decorre da disponibilidade documental, não de uma previsão estatística de êxito. Autenticidade, conteúdo e suficiência da prova dependem de conferência.'
      : 'Fundamentação da avaliação salva. Os documentos devem ser conferidos; a recomendação não garante o resultado judicial.',
  }
}
