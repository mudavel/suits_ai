import { generateDraft, saveStrategy } from './api.js'

// Persist the direction before generation, but expose a single action to the lawyer.
export async function prepareDraft({ request, strategy, onPhase = () => {} }) {
  let saved = strategy
  if (request) {
    onPhase('saving')
    saved = await saveStrategy(request)
  }
  if (!saved) throw new Error('Defina o encaminhamento para gerar a minuta.')
  onPhase('generating')
  try {
    return await generateDraft(saved.case_id, { strategy_id: saved.strategy_id, action: saved.action,
      format: 'formal', settlement_amount: saved.settlement_amount })
  } catch (cause) {
    const error = new Error('O encaminhamento está salvo, mas não foi possível confirmar a geração da minuta. Consulte o histórico antes de tentar novamente. ' + cause.message, { cause })
    error.status = cause.status
    throw error
  }
}
