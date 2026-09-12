import { useEffect, useState } from 'react'
import { ArrowUpRight, BarChart3, FileCheck2 } from 'lucide-react'
import { requestJson } from '../../services/api'

export default function MonitoringPage() {
  const [overview, setOverview] = useState(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSimulation, setShowSimulation] = useState(false)
  const [acceptanceRate, setAcceptanceRate] = useState(65)

  useEffect(() => {
    let active = true
    requestJson('/api/monitoring/overview').then(data => {
      if (active) { setOverview(data); setLoading(false) }
    }).catch(() => { if (active) { setError(true); setLoading(false) } })
    return () => { active = false }
  }, [])

  const amount = value => value == null ? '—' : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
  const percent = value => value == null ? '—' : (value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%'
  const metrics = [
    { label: 'Economia estimada', value: showSimulation ? 'R$ 58,4M' : amount(overview?.total_cost_avoidance), note: showSimulation ? 'Valor ilustrativo' : 'Economia no contencioso' },
    { label: 'Taxa de aderência', value: showSimulation ? '91,8%' : percent(overview?.adherence_rate), note: 'Seguimento das recomendações' },
    { label: 'Tempo de negociação', value: showSimulation ? '12 dias' : overview?.avg_negotiation_time_days == null ? '—' : overview.avg_negotiation_time_days + ' dias', note: 'Tempo médio até o acordo' },
    { label: 'Processos', value: showSimulation ? '60.000' : overview?.total_cases?.toLocaleString('pt-BR') ?? '—', note: showSimulation ? 'Volume ilustrativo' : 'Casos cadastrados' },
  ]

  return (
    <div className="space-y-7">
      <p className="eyebrow">CONTENCIOSO / GOVERNANÇA</p>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-line pb-7">
        <div className="space-y-3"><h1>Uma visão de toda a operação.</h1><p className="text-sm text-muted">Acompanhe o contencioso e os resultados de cada decisão.</p></div>
        <button type="button" aria-pressed={showSimulation} onClick={() => setShowSimulation(!showSimulation)} className="inline-flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-line text-xs hover:bg-accent-soft">{showSimulation ? 'Voltar aos dados da operação' : 'Explorar simulação'}<ArrowUpRight size={15} /></button>
      </div>
      {showSimulation ? <p role="status" className="rounded-lg bg-accent-soft border border-accent/40 p-4 text-xs text-accent-ink leading-relaxed"><strong>Simulação de apresentação.</strong> Todos os valores abaixo são ilustrativos e não representam os resultados dos casos cadastrados.</p> : error ? <p role="alert" className="rounded-lg bg-negative-soft p-4 text-xs text-negative">Não foi possível carregar os indicadores. Recarregue a página para tentar novamente.</p> : <p role="status" className="text-xs text-muted">{loading ? 'Carregando indicadores...' : overview?.metrics_status === 'available' ? 'Indicadores disponíveis para os casos cadastrados.' : 'Contagens disponíveis. Os demais indicadores aguardam dados validados.'}</p>}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-line rounded-lg overflow-hidden">
        {metrics.map(metric => <div key={metric.label} className="metric-cell"><p className="eyebrow">{metric.label}</p><p className="metric-value">{metric.value}</p><p className="text-[11px] text-muted">{metric.note}</p></div>)}
      </div>
      <section className="border border-line rounded-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"><div><p className="eyebrow mb-2">CENÁRIOS DE ACORDO</p><h2 className="text-2xl">O impacto de cada possibilidade.</h2><p className="text-xs text-muted mt-3 max-w-xl leading-relaxed">{showSimulation ? 'Explore como uma taxa de aceite diferente altera esta projeção ilustrativa.' : 'A simulação permite explorar cenários de aceite. As projeções não são indicadores operacionais.'}</p></div><span className="text-xs text-accent-ink border border-line rounded px-2.5 py-1.5 shrink-0">{showSimulation ? 'Simulação' : 'Em preparação'}</span></div>
        {showSimulation ? <div className="mt-8"><div className="flex items-end justify-between gap-4 mb-7"><span className="text-sm text-muted">Projeção ilustrativa de economia</span><strong className="text-3xl font-normal tracking-tight">R$ {(58.4 * acceptanceRate / 65).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M</strong></div><label htmlFor="acceptance" className="text-xs text-muted">Taxa de aceite: {acceptanceRate}%</label><input id="acceptance" type="range" min="30" max="90" step="5" value={acceptanceRate} onChange={e => setAcceptanceRate(Number(e.target.value))} className="w-full my-4" /><div className="flex justify-between text-[10px] text-muted"><span>30% · Conservador</span><span>90% · Otimista</span></div></div> : <div className="mt-8 pt-6 border-t border-line flex items-center gap-3 text-xs text-muted"><BarChart3 size={22} strokeWidth={1.2} /><p>Use “Explorar simulação” para conhecer a interação com valores de demonstração.</p></div>}
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <section className="border border-line rounded-lg p-6">
          <p className="eyebrow mb-3">ESCRITÓRIOS</p><h2 className="text-2xl">Aderência por equipe</h2>
          {showSimulation ? <div className="mt-6 space-y-5">{[{ name: 'Escritório A', rate: 96.2 }, { name: 'Escritório B', rate: 94 }, { name: 'Escritório C', rate: 86.4 }].map(item => <div key={item.name}><div className="flex justify-between text-xs mb-2"><span>{item.name}</span><span>{item.rate.toLocaleString('pt-BR')}%</span></div><div className="h-1 bg-surface-hover"><div className="h-1 bg-accent" style={{ width: item.rate + '%' }} /></div></div>)}</div> : <div className="empty-panel"><BarChart3 size={27} strokeWidth={1} /><p>Os indicadores de aderência por equipe ainda não estão disponíveis.</p></div>}
        </section>
        <section className="border border-line rounded-lg p-6">
          <p className="eyebrow mb-3">DOCUMENTAÇÃO</p><h2 className="text-2xl">Qualidade dos subsídios</h2>
          {showSimulation ? <div className="mt-6 divide-y divide-line">{[{ name: 'Contrato', rate: '12,1%' }, { name: 'Extrato bancário', rate: '8,3%' }, { name: 'Comprovante de crédito', rate: '18,4%' }].map(item => <div key={item.name} className="flex items-center justify-between gap-3 py-4 text-xs"><span>{item.name}</span><span className="text-muted">{item.rate} ausente</span></div>)}</div> : <div className="empty-panel"><FileCheck2 size={27} strokeWidth={1} /><p>Os indicadores de qualidade documental ainda não estão disponíveis nesta visão.</p></div>}
        </section>
      </div>
    </div>
  )
}
