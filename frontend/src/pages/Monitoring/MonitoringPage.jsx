import { TrendingUp, DollarSign, Users, Award, AlertOctagon, Sliders } from 'lucide-react'

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cockpit de Governança Jurídica & ROI
          </h1>
          <p className="text-sm text-slate-500">
            Painel executivo do Banco Unicamp: Aderência à política, Efetividade financeira e Cost Avoidance
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-3">
          <select className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Todas as UFs (Brasil)</option>
            <option>São Paulo (SP)</option>
            <option>Rio de Janeiro (RJ)</option>
            <option>Minas Gerais (MG)</option>
          </select>

          <select className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Todos os Escritórios Parceiros</option>
            <option>Pinheiro & Associados</option>
            <option>Machado Meyer Silva</option>
            <option>Mattos Filho Jurídico</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Economia Total (Cost Avoidance)</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">R$ 58,4 Milhões</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            +18.4% vs. contencioso tradicional
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Taxa de Aderência (A01)</span>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-blue-600 mt-2">91.8%</p>
          <p className="text-xs text-slate-400 mt-1">Advogados seguindo a recomendação</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Taxa de Overrides</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">8.2%</p>
          <p className="text-xs text-slate-400 mt-1">Casos com desvio justificado pelo advogado</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Processos Triados</span>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-600 mt-2">60.000</p>
          <p className="text-xs text-slate-400 mt-1">Base de dados histórica calibrada</p>
        </div>
      </div>

      {/* Interactive Sensitivity / Acceptance Simulator */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              Simulador Contrafactual de Sensibilidade de Acordos
            </h2>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded font-semibold">
            Modelo Atuarial Calibrado
          </span>
        </div>
        <p className="text-xs text-slate-600 mb-6">
          Ajuste a taxa estimada de aceite dos autores às propostas no valor alvo para recalcular o Cost Avoidance projetado do Banco Unicamp.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">Taxa de Aceite Estimada: 65%</span>
            <span className="font-bold text-emerald-600">Economia Projetada: R$ 61,2 Milhões / ano</span>
          </div>
          <input
            type="range"
            min="30"
            max="90"
            defaultValue="65"
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Conservador (30%)</span>
            <span>Cenário Base (65%)</span>
            <span>Otimista (90%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

