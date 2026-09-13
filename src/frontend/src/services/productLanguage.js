// Translate system metadata only; evidence and source quotations stay unchanged.
const systemMessages = new Map([
  ['Motor da branch 1 ainda não integrado: probabilidade, recomendação e alçada indisponíveis.', 'A recomendação de acordo ou defesa, a probabilidade de derrota e a alçada ainda não estão disponíveis. A análise documental continua disponível.'],
  ['B1 não declara a semântica de confidence_score; não apresentar como probabilidade de derrota.', 'A interpretação do índice informado não foi definida. Ele não deve ser usado como probabilidade de derrota.'],
  ['Dossiê presente sem conclusão documental inequívoca; dossie enviado ao motor como null.', 'O dossiê foi localizado, mas sua conclusão não é inequívoca. Ela não foi considerada na recomendação.'],
  ['Motor da branch 1 indisponível ou incompatível com o contrato.', 'As diretrizes de atuação estão indisponíveis. Tente novamente mais tarde.'],
  ['O motor exige valor da causa positivo; revise os dados do caso.', 'Informe um valor da causa maior que zero para consultar a recomendação.'],
  ['Conclusões divergentes nos dossiês; revise antes de consultar o motor.', 'Os dossiês apresentam conclusões divergentes. Revise os documentos antes de consultar a recomendação.'],
  ['Aguardando os indicadores validados da branch 4.', 'Os indicadores validados ainda não estão disponíveis para esta operação.'],
  ['Modo local: busca de trechos, sem interpretação por modelo de linguagem.', 'Consulta aos trechos dos documentos, sem análise assistida por IA.'],
])

export const systemText = text => systemMessages.get(text) ?? text
export const riskLabel = value => ({ BAIXO: 'Baixo', MEDIO: 'Moderado', MODERADO: 'Moderado', ALTO: 'Alto', CRITICO: 'Crítico' })[value] || 'Não informado'
export const reasonLabel = value => ({
  DOSSIE_NAO_CONFORME: 'Divergência apontada no dossiê',
  CADEIA_COMPLETA: 'Conjunto documental completo',
  FALHA_PROBATORIA: 'Insuficiência de documentos essenciais',
  POWER_PAIR_AUSENTE: 'Documentos essenciais ausentes',
  ML_ZONA_CINZENTA: 'Avaliação jurimétrica do conjunto documental',
})[value] || 'Fundamentação não informada'

export function policyRule(text) {
  return text
    .replace(/^MOCK: /, 'Demonstração: ')
    .replace('Acordo Fast-Track', 'acordo prioritário')
    .replace('Ativação do Modelo Jurimétrico Random Forest Calibrado.', 'Avaliação jurimétrica complementar.')
    .replace('Classificador Random Forest Calibrado estimou', 'A avaliação jurimétrica estimou')
    .replace(/Fallback estatístico ativado \([\s\S]*\): probabilidade estimada em/, 'Estimativa estatística alternativa: probabilidade estimada em')
}

const fieldNames = {
  case_id: 'Processo', case_number: 'Número do processo', settlement_amount: 'Valor do acordo',
  proposed_amount: 'Valor proposto', override_reason: 'Justificativa', lawyer_id: 'Advogado',
  law_firm_id: 'Escritório', message: 'Mensagem', content_markdown: 'Texto da minuta',
  expected_case_version: 'Atualização do processo', action: 'Decisão', format: 'Formato',
  uf: 'UF', status: 'Situação do processo', page: 'Página', page_size: 'Processos por página',
  limit: 'Quantidade de registros', offset: 'Página do histórico', analysis_id: 'Parecer',
  session_id: 'Conversa', draft_id: 'Minuta', idempotency_key: 'Registro da decisão',
}

const errors = new Map([
  ...systemMessages,
  ...[
    'O parecer ou o processo mudou. Atualize os dados e revise o encaminhamento.',
    'Justifique o encaminhamento que diverge da recomendação ou supera o teto.',
    'O tipo e o valor da minuta devem corresponder ao encaminhamento salvo.',
    'Selecione uma minuta vinculada ao encaminhamento deste processo.',
    'A decisão deve corresponder ao encaminhamento da minuta revisada.',
    'Informe a minuta e seu texto revisado em conjunto.',
  ].map(message => [message, message]),
  ['O encaminhamento mudou. Atualize os dados antes de preparar ou concluir a peça.', 'O encaminhamento mudou. Atualize os dados antes de preparar a minuta ou concluir a análise.'],
  ['Chave de idempotência já usada com outros dados.', 'Esta tentativa de registro já foi utilizada com outros dados. Atualize o processo e revise a decisão.'],
  ['Informe override_reason para divergir da política ou exceder o teto.', 'Informe uma justificativa para divergir da recomendação ou ultrapassar a alçada.'],
  ['Informe settlement_amount positivo para acordo.', 'Informe um valor de acordo maior que zero.'],
  ['Defesa não aceita settlement_amount.', 'Uma decisão de defesa não deve incluir valor de acordo.'],
  ['Defesa não aceita valor de acordo ou formato WhatsApp.', 'Uma minuta de defesa deve usar o formato formal e não deve incluir valor de acordo.'],
  ['Valores monetários devem ter no máximo duas casas decimais.', 'Informe os valores com até duas casas decimais.'],
  ['Análise desatualizada. Execute uma nova análise.', 'O parecer está desatualizado. Atualize a análise antes de registrar a decisão.'],
  ['A IA retornou uma referência que não consta do contexto.', 'Não foi possível conferir uma das fontes da resposta. Tente novamente.'],
  ['Não foi possível obter uma resposta válida da OpenAI.', 'Não foi possível concluir a resposta. Tente novamente.'],
  ['A IA atingiu o limite de geração; tente uma solicitação menor.', 'A resposta ficou extensa demais. Faça uma pergunta mais específica.'],
  ['A IA não concluiu a geração; tente novamente.', 'A resposta não foi concluída. Tente novamente.'],
  ['A IA não produziu conteúdo estruturado; revise e tente novamente.', 'Não foi possível organizar a resposta. Tente novamente.'],
])
for (const message of [
  'Caso já concluído', 'Caso não encontrado', 'Caso não encontrado.', 'Número de processo já cadastrado.',
  'Caso já concluído ou alterado. Recarregue antes de registrar.', 'O caso mudou durante a análise. Recarregue os dados.',
  'Conversa não encontrada neste caso.', 'Conversa pertence a outro caso.', 'Minuta não encontrada.',
  'Documento não encontrado neste caso.', 'Análise não pertence ao caso.',
]) errors.set(message, message)

function validationMessage(item) {
  const message = typeof item.msg === 'string' ? item.msg.replace(/^Value error, /, '') : ''
  if (errors.has(message)) return errors.get(message)
  const count = Number(item.ctx?.min_length ?? item.ctx?.max_length)
  const size = Number.isFinite(count) ? count : null
  return ({
    missing: 'Preenchimento obrigatório.',
    string_too_short: size == null ? 'Texto muito curto.' : `Informe pelo menos ${size} caracteres.`,
    string_too_long: size == null ? 'Texto muito longo.' : `Use no máximo ${size} caracteres.`,
    greater_than: Number(item.ctx?.gt) === 0 ? 'Informe um valor maior que zero.' : 'O valor está abaixo do mínimo permitido.',
    greater_than_equal: 'O valor está abaixo do mínimo permitido.',
    less_than: 'O valor está acima do máximo permitido.',
    less_than_equal: 'O valor está acima do máximo permitido.',
    int_parsing: 'Informe um número inteiro.', int_type: 'Informe um número inteiro.',
    float_parsing: 'Informe um valor numérico.', finite_number: 'Informe um valor numérico válido.',
    enum: 'Selecione uma das opções disponíveis.', literal_error: 'Selecione uma das opções disponíveis.',
    string_type: 'Informe um texto válido.',
  })[item.type] || 'Valor inválido'
}

export function errorDetail(detail, status, { writing = false } = {}) {
  if (typeof detail === 'string' && errors.has(detail)) return errors.get(detail)
  if (Array.isArray(detail) && detail.length) return detail.map(item => {
    const field = Array.isArray(item?.loc) ? item.loc.findLast(part => Object.hasOwn(fieldNames, part)) : null
    return `${fieldNames[field] || 'Dados informados'}: ${validationMessage(item || {})}`
  }).join('; ')
  if (status >= 500) return writing
    ? 'Não foi possível confirmar a conclusão da solicitação. Consulte o histórico antes de tentar novamente.'
    : 'Não foi possível carregar os dados. A plataforma está temporariamente indisponível. Tente novamente.'
  return ({
    401: 'Entre novamente para continuar.', 403: 'Seu perfil não tem acesso a esta informação.',
    404: 'Não encontramos o documento ou processo solicitado.',
    409: 'O processo foi atualizado. Recarregue os dados antes de decidir.',
    422: 'Revise os campos informados.',
    429: 'Há muitas solicitações no momento. Aguarde um pouco e tente novamente.',
  })[status] || 'Não foi possível concluir a solicitação.'
}
