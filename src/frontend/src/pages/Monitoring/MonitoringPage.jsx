import { useState } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  Award,
  AlertOctagon,
  Sliders,
  Building,
  BarChart,
  ArrowUpRight,
} from 'lucide-react'

export default function MonitoringPage() {
  const [acceptanceRate, setAcceptanceRate] = useState(65)

  // Cálculo dinâmico de economia projetada
  const calculatedSavingsMillions = (58.4 * (acceptanceRate / 65)).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-white tracking-tight">
            Cockpit de Governança & ROI
          </h1>
          <p className="text-xs text-slate-400">
            Diretoria Jurídica • Banco Unicamp • Aderência, Efetividade e Simulação Contrafactual
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select className="text-xs bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500">
            <option>Brasil (Todas as UFs)</option>
            <option>São Paulo (SP)</option>
            <option>Rio de Janeiro (RJ)</option>
            <option>Maranhão (MA)</option>
          </select>

          <select className="text-xs bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500">
            <option>Todos os Escritórios</option>
            <option>Pinheiro & Associados</option>
            <option>Machado Meyer Silva</option>
          </select>
        </div>
      </div>

      {/* Main KPI Strip (Minimalist & Typographic) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-2 border-b border-white/[0.06]">
        <div>
          <span className="text-[11px] text-slate-500 uppercase font-mono">Cost Avoidance Total</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            R$ 58,4M
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">+18.4% de economia líquida</p>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 uppercase font-mono">Taxa de Aderência (A01)</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
            91.8%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Seguimento das recomendações</p>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 uppercase font-mono">Taxa de Overrides</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
            8.2%
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Desvios fundamentados</p>
        </div>

        <div>
          <span className="text-[11px] text-slate-500 uppercase font-mono">Casos Calibrados</span>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            60.000
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Base histórica oficial</p>
        </div>
      </div>

      {/* Contrafactual Sensitivity Simulator (Clean Flat Block) */}
      <div className="p-5 border border-white/[0.08] rounded-xl bg-white/[0.01] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Simulador Contrafactual de Sensibilidade
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ajuste a taxa de conversão dos acordos propostos para recalcular o ROI anual do banco.
            </p>
          </div>
          <span className="text-emerald-400 font-bold font-mono text-sm">
            R$ {calculatedSavingsMillions}M / ano projetado
          </span>
        </div>

        <div className="space-y-2 pt-2">
          <input
            type="range"
            min="30"
            max="90"
            step="5"
            value={acceptanceRate}
            onChange={(e) => setAcceptanceRate(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>Conservador (30% aceite)</span>
            <span className="text-blue-400 font-bold">Cenário Atual ({acceptanceRate}% aceite)</span>
            <span>Otimista (90% aceite)</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Law Firms & Subsidies Diagnostic */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Law Firms Performance */}
        <div className="border border-white/[0.08] rounded-xl p-5 bg-white/[0.01] space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Aderência por Escritório Credenciado
          </h3>
          <div className="divide-y divide-white/[0.04] text-xs">
            {[
              { name: 'Pinheiro & Associados', rate: '96.2%', volume: '14.200 casos' },
              { name: 'Machado Meyer Silva', rate: '94.0%', volume: '12.800 casos' },
              { name: 'Mattos Filho Jurídico', rate: '91.5%', volume: '11.900 casos' },
              { name: 'Demarest Advogados', rate: '86.4%', volume: '10.500 casos' },
              { name: 'TozziniFreire Advogados', rate: '82.1%', volume: '10.600 casos' },
            ].map((f, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">{f.name}</span>
                  <div className="text-[10px] text-slate-500">{f.volume}</div>
                </div>
                <span className="font-mono font-bold text-blue-400">{f.rate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subsidies Bottlenecks */}
        <div className="border border-white/[0.08] rounded-xl p-5 bg-white/[0.01] space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Diagnóstico de Gargalos de Subsídios
          </h3>
          <div className="divide-y divide-white/[0.04] text-xs">
            {[
              { doc: 'Comprovante BACEN / SCR', miss: '18.4% ausente', risk: '+26.8 p.p. risco', uf: 'RJ / SP' },
              { doc: 'Contrato Digital com Biometria', miss: '12.1% ausente', risk: '+42.5 p.p. risco', uf: 'MA / BA' },
              { doc: 'Extrato TED Mesma Titularidade', miss: '8.3% ausente', risk: '+38.0 p.p. risco', uf: 'AM / PA' },
              { doc: 'Dossiê Veritas Antifraude', miss: '4.2% ausente', risk: '+89.0 p.p. risco', uf: 'Nacional' },
            ].map((d, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-200">{d.doc}</span>
                  <div className="text-[10px] text-slate-500">{d.risk} • Foco: {d.uf}</div>
                </div>
                <span className="font-mono text-rose-400 text-[11px] font-semibold">{d.miss}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
