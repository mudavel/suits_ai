import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  X,
  RefreshCw,
  Sparkles,
  ChevronRight,
  SlidersHorizontal,
  Filter,
} from 'lucide-react'
import { fetchCases } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function CaseSelectionPage() {
  const { currentProfile } = useAuth()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('RISK_DESC')
  const [selectedCase, setSelectedCase] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetchCases().then(({ data, isMock }) => {
      setCases(data)
      setIsMockData(isMock)
      setLoading(false)
    })
  }

  useEffect(() => {
    let isMounted = true
    fetchCases().then(({ data, isMock }) => {
      if (isMounted) {
        setCases(data)
        setIsMockData(isMock)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Filtragem e ordenação
  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        const matchesSearch =
          c.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.claimant.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.claimantCpf && c.claimantCpf.includes(searchTerm)) ||
          c.court.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus =
          statusFilter === 'ALL' || c.recommendation === statusFilter

        const matchesState =
          stateFilter === 'ALL' || c.state === stateFilter

        return matchesSearch && matchesStatus && matchesState
      })
      .sort((a, b) => {
        if (sortBy === 'RISK_DESC') return b.expectedLoss - a.expectedLoss
        if (sortBy === 'CLAIM_DESC') return b.claimValue - a.claimValue
        if (sortBy === 'HEARING_ASC') return a.daysToHearing - b.daysToHearing
        return a.id - b.id
      })
  }, [cases, searchTerm, statusFilter, stateFilter, sortBy])

  // Métricas agregadas em linha única
  const stats = useMemo(() => {
    const total = cases.length
    const defense = cases.filter((c) => c.recommendation === 'DEFESA').length
    const urgent = cases.filter((c) => c.recommendation === 'ACORDO URGENTE').length
    const agreement = cases.filter((c) => c.recommendation === 'ACORDO').length
    const totalExposure = cases.reduce((acc, c) => acc + (c.claimValue || 0), 0)
    const totalExpectedLoss = cases.reduce((acc, c) => acc + (c.expectedLoss || 0), 0)
    return { total, defense, urgent, agreement, totalExposure, totalExpectedLoss }
  }, [cases])

  return (
    <div className="space-y-6">
      {/* Header — Continuous Minimalist Bar (No bulky cards) */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white tracking-tight">
              Triagem de Processos Cíveis
            </h1>
            <span className="text-[11px] font-mono text-slate-400 bg-white/[0.04] border border-white/[0.08] px-2 py-0.5 rounded">
              {filteredCases.length} casos atribuídos
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {currentProfile.organization} • Matriz de decisão probatória e precificação atuarial
          </p>
        </div>

        {/* Minimalist Metrics Strip (Linear/Enterprise style) */}
        <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
          <div>
            <span className="text-slate-500">Exposição:</span>{' '}
            <strong className="text-slate-200">
              R$ {(stats.totalExposure / 1000).toFixed(1)}k
            </strong>
          </div>
          <div className="h-3 w-px bg-white/[0.1]" />
          <div>
            <span className="text-slate-500">E[Perda]:</span>{' '}
            <strong className="text-rose-400">
              R$ {(stats.totalExpectedLoss / 1000).toFixed(1)}k
            </strong>
          </div>
          <div className="h-3 w-px bg-white/[0.1]" />
          <div>
            <span className="text-slate-500">Defesa:</span>{' '}
            <strong className="text-emerald-400">{stats.defense}</strong>
          </div>
          <div className="h-3 w-px bg-white/[0.1]" />
          <div>
            <span className="text-slate-500">Acordo:</span>{' '}
            <strong className="text-amber-400">{stats.agreement + stats.urgent}</strong>
          </div>
        </div>
      </div>

      {/* Seamless Filter & Search Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nº do processo, autor, CPF ou comarca..."
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-white/[0.03] text-slate-200 border border-white/[0.08] rounded-lg focus:outline-none focus:border-blue-500/80 placeholder:text-slate-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/80"
          >
            <option value="ALL">Todas Recomendações</option>
            <option value="DEFESA">Defesa (Cadeia Completa)</option>
            <option value="ACORDO">Acordo Atuarial</option>
            <option value="ACORDO URGENTE">Acordo Fast-Track</option>
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="text-xs bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/80"
          >
            <option value="ALL">Todas UFs</option>
            <option value="MA">Maranhão (MA)</option>
            <option value="AM">Amazonas (AM)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-white/[0.03] text-slate-300 border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500/80"
          >
            <option value="RISK_DESC">Maior Risco E[Perda]</option>
            <option value="CLAIM_DESC">Maior Valor da Causa</option>
            <option value="HEARING_ASC">Audiência Próxima</option>
          </select>

          <button
            onClick={loadData}
            title="Recarregar dados"
            className="p-1.5 text-slate-400 hover:text-white bg-white/[0.03] border border-white/[0.08] rounded-lg hover:bg-white/[0.06] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Continuous Table (Flat & Dense Enterprise Design) */}
      <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-white/[0.01]">
        {loading ? (
          <div className="p-16 text-center text-slate-500 text-xs space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-400" />
            <p>Carregando contratos e sentenças...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs space-y-2">
            <p className="text-slate-300 font-semibold text-sm">Nenhum processo encontrado</p>
            <p>Ajuste os filtros de pesquisa acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-slate-400 text-[11px] font-mono">
                  <th className="py-2.5 px-4 font-normal">PROCESSO & AUTOR</th>
                  <th className="py-2.5 px-3 font-normal">COMARCA</th>
                  <th className="py-2.5 px-3 font-normal">VALOR CAUSA</th>
                  <th className="py-2.5 px-3 font-normal">E[PERDA]</th>
                  <th className="py-2.5 px-3 font-normal">RECOMENDAÇÃO</th>
                  <th className="py-2.5 px-3 font-normal">SUBSÍDIOS</th>
                  <th className="py-2.5 px-3 font-normal">ALVO DE ACORDO</th>
                  <th className="py-2.5 px-4 font-normal text-right">AÇÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredCases.map((c) => {
                  const isDefense = c.recommendation === 'DEFESA'
                  const isUrgent = c.recommendation === 'ACORDO URGENTE'

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      {/* Case Number & Claimant */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                          {c.claimant}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{c.caseNumber}</span>
                          <span>•</span>
                          <span>CPF {c.claimantCpf}</span>
                        </div>
                      </td>

                      {/* Court & Urgency */}
                      <td className="py-3 px-3 text-slate-300">
                        <div className="truncate max-w-[160px]" title={c.court}>
                          {c.court}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {c.daysToHearing} dias p/ audiência
                        </div>
                      </td>

                      {/* Claim Value */}
                      <td className="py-3 px-3 font-mono text-slate-200">
                        R$ {c.claimValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Expected Loss */}
                      <td className="py-3 px-3 font-mono">
                        <span className="text-rose-400 font-medium">
                          R$ {c.expectedLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          P(derrota): {Math.round(c.lossProbability * 100)}%
                        </div>
                      </td>

                      {/* Recommendation Tag (Sleek & Flat) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isDefense
                                ? 'bg-emerald-400'
                                : isUrgent
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span
                            className={`font-semibold text-[11px] ${
                              isDefense
                                ? 'text-emerald-400'
                                : isUrgent
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {c.recommendation}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 truncate max-w-[140px] mt-0.5">
                          {c.reasoningCode}
                        </div>
                      </td>

                      {/* Subsidies Micro-indicators */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span
                            className={`px-1 py-0.5 rounded ${
                              c.subsidies.contract.ok
                                ? 'text-emerald-400 bg-emerald-950/40'
                                : 'text-rose-400 bg-rose-950/40'
                            }`}
                          >
                            CCB
                          </span>
                          <span
                            className={`px-1 py-0.5 rounded ${
                              c.subsidies.bankStatement.ok
                                ? 'text-emerald-400 bg-emerald-950/40'
                                : 'text-rose-400 bg-rose-950/40'
                            }`}
                          >
                            TED
                          </span>
                          <span
                            className={`px-1 py-0.5 rounded ${
                              c.subsidies.bacen.ok
                                ? 'text-emerald-400 bg-emerald-950/40'
                                : 'text-rose-400 bg-rose-950/40'
                            }`}
                          >
                            BACEN
                          </span>
                        </div>
                      </td>

                      {/* Settlement Target */}
                      <td className="py-3 px-3 font-mono">
                        {isDefense ? (
                          <span className="text-slate-500 text-[11px]">—</span>
                        ) : (
                          <div>
                            <span className="text-slate-200 font-medium">
                              R$ {c.settlementPricing.target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="text-[10px] text-slate-500">
                              Teto: R$ {c.settlementPricing.ceiling.toLocaleString('pt-BR')}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/workspace/${c.id}`}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white font-medium text-xs py-1 px-2 rounded hover:bg-white/[0.06] transition-colors"
                        >
                          <span>Abrir</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Detail Drawer / Bottom Panel if selected */}
      {selectedCase && (
        <div className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-500">Diagnóstico Selecionado</span>
            <p className="font-semibold text-slate-200">{selectedCase.reasoningTitle}</p>
            <p className="text-slate-400 max-w-2xl leading-relaxed">{selectedCase.reasoningDescription}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedCase(null)}
              className="px-3 py-1.5 text-slate-400 hover:text-white"
            >
              Fechar
            </button>
            <Link
              to={`/workspace/${selectedCase.id}`}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <span>Trabalhar no Caso #{selectedCase.id}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
