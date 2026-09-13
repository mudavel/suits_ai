import { CalendarClock, Check, CircleDashed, Minus } from 'lucide-react'
import { dateTime } from '../../services/workflow'

function shifted(value, hours) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Date(date.getTime() + hours * 60 * 60 * 1000).toISOString()
}

export default function ProcessTimeline({ caseData, analysis, strategy }) {
  const mockStart = new Date(Date.UTC(2026, 8, 7 + (caseData.id % 4), 12, 30)).toISOString()
  const analysisStarted = analysis?.created_at || (caseData.status !== 'PENDENTE' ? shifted(mockStart, 4) : null)
  const strategyAt = strategy?.created_at || null
  const agreement = strategy?.action === 'ACORDO'
  const offerAt = agreement && strategyAt ? shifted(strategyAt, 2) : null
  const counterAt = agreement && offerAt && caseData.status === 'CONCLUIDO' ? shifted(offerAt, 26) : null
  const events = [
    { label: 'Início do acompanhamento', value: mockStart, state: 'done', detail: 'Entrada do processo na esteira' },
    { label: 'Análise iniciada', value: analysisStarted, state: analysisStarted ? 'done' : 'pending', detail: analysisStarted ? 'Documentos em avaliação' : 'Aguardando início' },
    { label: 'Oferta enviada', value: offerAt, state: strategy && !agreement ? 'skip' : offerAt ? 'done' : 'pending', detail: strategy && !agreement ? 'Não se aplica à defesa' : offerAt ? 'Proposta encaminhada à parte autora' : 'Aguardando definição de acordo' },
    { label: 'Contraproposta', value: counterAt, state: strategy && !agreement ? 'skip' : counterAt ? 'done' : 'pending', detail: strategy && !agreement ? 'Não se aplica à defesa' : counterAt ? 'Retorno recebido para negociação' : 'Sem retorno registrado' },
    { label: 'Conclusão da análise', value: caseData.status === 'CONCLUIDO' ? shifted(counterAt || strategyAt || analysisStarted || mockStart, 4) : null, state: caseData.status === 'CONCLUIDO' ? 'done' : 'pending', detail: caseData.status === 'CONCLUIDO' ? 'Decisão interna registrada' : 'Em andamento' },
  ]

  return <section className="process-timeline" aria-labelledby="process-timeline-title">
    <div className="section-heading">
      <div><p className="eyebrow">OBSERVABILIDADE</p><h2 id="process-timeline-title">Linha do tempo do processo</h2></div>
      <span className="text-[10px] text-muted inline-flex items-center gap-1.5"><CalendarClock size={13} />Demonstração</span>
    </div>
    <p className="text-xs text-muted">Os marcos e horários abaixo são ilustrativos; a base fornecida não contém histórico de ofertas, recusas ou contrapropostas.</p>
    <ol className="timeline-grid">
      {events.map(event => <li key={event.label} className={'timeline-event timeline-event--' + event.state}>
        <span className="timeline-icon" aria-hidden="true">{event.state === 'done' ? <Check size={12} /> : event.state === 'skip' ? <Minus size={12} /> : <CircleDashed size={12} />}</span>
        <div><p className="text-xs font-medium">{event.label}</p><p className="text-[10px] text-muted mt-1">{event.value ? dateTime(event.value) : event.detail}</p>{event.value && <p className="text-[10px] text-muted mt-1">{event.detail}</p>}</div>
      </li>)}
    </ol>
  </section>
}
