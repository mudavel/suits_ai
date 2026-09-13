import { money } from './workflow.js'

const documentNames = {
  CONTRATO: 'contrato', EXTRATO: 'extrato bancário', COMPROVANTE_CREDITO: 'comprovante de crédito',
  DOSSIE: 'dossiê de verificação', EVOLUCAO_DIVIDA: 'demonstrativo de evolução da dívida', LAUDO_REFERENCIADO: 'laudo referenciado',
}
const join = items => items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' e ' + items.at(-1)
const plain = text => text.replace(/^\s*[-*]\s+/gm, '').replace(/\*\*/g, '').trim()

export function caseIntroduction(caseData) {
  const parties = caseData.claimant && caseData.defendant
    ? `${caseData.claimant} ajuizou ação em face de ${caseData.defendant}`
    : `O processo ${caseData.caseNumber || 'em análise'} trata de demanda bancária`
  const subject = caseData.reasoningDescription ? `, sobre ${caseData.reasoningDescription.toLocaleLowerCase('pt-BR')}` : ''
  const court = caseData.court ? ` O feito tramita na ${caseData.court}.` : ''
  const value = caseData.claimValue != null ? ` O valor atribuído à causa é de ${money(caseData.claimValue)}.` : ''
  return `${parties}${subject}.${court}${value}`
}

export function caseAssessment(caseData, analysis, current = true) {
  const text = analysis?.explanation?.trim() || ''
  const legacy = /^#{1,6}\s+(?:Controvérsias|Elementos|Pendências)/mi.test(text)
  // New prose is already authored from the process sources: do not replace it with document checks.
  if (text && analysis.generation_mode === 'openai' && !legacy) return { text, generated: true, legacy: false }
  if (legacy) {
    const sections = text.split(/(?=^#{1,6}\s)/m).filter(Boolean)
    const paragraphs = current ? [caseIntroduction(caseData)] : []
    for (const section of sections) {
      const [heading, ...body] = section.split('\n')
      const entries = body.join('\n').split(/^\s*[-*]\s+/m).map(plain).filter(Boolean)
      // Retain the substantive evidence from the old three-item format, without repeating every issue.
      const count = /Elementos/i.test(heading) ? 3 : 1
      if (entries.length) paragraphs.push(entries.slice(0, count).join(' '))
    }
    return { text: paragraphs.join('\n\n'), generated: true, legacy: true }
  }
  // Local/old rule-only outputs are not a factual synopsis. Use identified case data, not diagnostic logs.
  if (!current) return { text: 'Este parecer anterior não contém um resumo textual do processo. Atualize a análise para obter uma síntese dos fatos e documentos.', generated: false, legacy: true }
  const paragraphs = [caseIntroduction(caseData)]
  const account = (caseData.claims || []).filter(item => typeof item === 'string' && item.trim())
  if (account.length) paragraphs.push('Na narrativa apresentada na inicial: ' + account.slice(0, 2).map(plain).join(' '))
  const documents = [...new Set((caseData.documents || []).map(doc => documentNames[doc.document_type]).filter(Boolean))]
  if (documents.length) paragraphs.push(`O material disponível para análise inclui ${join(documents)}. O conteúdo desses documentos deve ser confrontado com as alegações da parte autora.`)
  else paragraphs.push('Não há subsídios bancários identificados no material disponível para esta síntese.')
  return { text: paragraphs.join('\n\n'), generated: false, legacy: true }
}
