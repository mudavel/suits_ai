import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  ArrowRight,
  X,
  RefreshCw,
  ChevronRight,
} from 'lucide-react'
import { fetchCases } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function CaseSelectionPage() {
  const { currentProfile } = useAuth()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(false)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('CLAIM_DESC')
  const [selectedCase, setSelectedCase] = useState(null)

  const loadData = () => {
    setLoading(true)
    setError(null)
    fetchCases().then(({ data, isMock }) => {
      setCases(data)
      setIsMockData(isMock)
      setLoading(false)
    }).catch(() => { setError('Não foi possível carregar os processos. Tente novamente.'); setLoading(false) })
  }

  useEffect(() => {
    let isMounted = true
    fetchCases().then(({ data, isMock }) => {
      if (isMounted) {
        setCases(data)
        setIsMockData(isMock)
        setLoading(false)
      }
    }).catch(() => { if (isMounted) { setError('Não foi possível carregar os processos. Tente novamente.'); setLoading(false) } })
    return () => {
      isMounted = false
    }
  }, [])

  // Filtragem e ordenação
  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        const matchesSearch =
          (c.caseNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.claimant || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (c.claimantCpf && c.claimantCpf.includes(searchTerm)) ||
          (c.court || '').toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus =
          statusFilter === 'ALL' || c.recommendation === statusFilter || (statusFilter === 'NONE' && !c.recommendation)

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
      <p className="eyebrow">CONTENCIOSO / PROCESSOS</p>
      {isMockData && <p role="status" className="text-xs text-accent-ink bg-accent-soft p-3 rounded-lg">Dados de demonstração fornecidos pela API.</p>}
      {/* Header — Continuous Minimalist Bar (No bulky cards) */}
      <div className="flex flex-col xl:flex-row xl:items-baseline xl:justify-between gap-4 border-b border-line pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-ink tracking-tight">
              Processos cíveis
            </h1>
            <span className="text-[11px] font-mono text-muted bg-surface border border-line px-2 py-0.5 rounded">
              {filteredCases.length} processos exibidos
            </span>
          </div>
          <p className="text-xs text-muted">
            {currentProfile.organization} • Cada caso, com o contexto que importa
          </p>
        </div>

        {/* Minimalist Metrics Strip (Linear/Enterprise style) */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-muted">
          <div>
            <span className="text-muted">Exposição:</span>{' '}
            <strong className="text-ink">
              {stats.totalExposure.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </strong>
          </div>
          <div className="h-3 w-px bg-surface" />
          <div>
            <span className="text-muted">E[Perda]:</span>{' '}
            <strong className="text-negative">
              {cases.some(c => c.expectedLoss != null) ? 'R$ ' + (stats.totalExpectedLoss / 1000).toFixed(1) + 'k' : '—'}
            </strong>
          </div>
          <div className="h-3 w-px bg-surface" />
          <div>
            <span className="text-muted">Defesa:</span>{' '}
            <strong className="text-positive">{cases.some(c => c.recommendation) ? stats.defense : '—'}</strong>
          </div>
          <div className="h-3 w-px bg-surface" />
          <div>
            <span className="text-muted">Acordo:</span>{' '}
            <strong className="text-accent-ink">{cases.some(c => c.recommendation) ? stats.agreement + stats.urgent : '—'}</strong>
          </div>
        </div>
      </div>

      {/* Seamless Filter & Search Row */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            aria-label="Buscar por processo ou partes"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por processo ou partes..."
            className="w-full pl-8 pr-4 py-1.5 text-xs bg-surface text-ink border border-line rounded-lg focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus:border-accent placeholder:text-muted transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            aria-label="Filtrar por recomendação"
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-surface text-ink border border-line rounded-lg px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus:border-accent"
          >
            <option value="ALL">Todas Recomendações</option>
            <option value="DEFESA">Defesa</option>
            <option value="ACORDO">Acordo</option>
            <option value="NONE">Sem recomendação</option>
          </select>

          <select
            value={stateFilter}
            aria-label="Filtrar por UF"
            onChange={(e) => setStateFilter(e.target.value)}
            className="text-xs bg-surface text-ink border border-line rounded-lg px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus:border-accent"
          >
            <option value="ALL">Todas UFs</option>
            <option value="MA">Maranhão (MA)</option>
            <option value="AM">Amazonas (AM)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="RJ">Rio de Janeiro (RJ)</option>
          </select>

          <select
            value={sortBy}
            aria-label="Ordenar processos"
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs bg-surface text-ink border border-line rounded-lg px-2.5 py-1.5 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 focus:border-accent"
          >
            <option value="RISK_DESC" disabled={!cases.some(c => c.expectedLoss != null)}>Maior perda esperada</option>
            <option value="CLAIM_DESC">Maior Valor da Causa</option>

          </select>

          <button
            onClick={loadData}
            title="Recarregar dados"
            className="p-1.5 text-muted hover:text-ink bg-surface border border-line rounded-lg hover:bg-surface-hover transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Continuous Table (Flat & Dense Enterprise Design) */}
      <div className="border border-line rounded-lg overflow-hidden bg-surface">
        {error ? (<div role="alert" className="p-12 text-center text-sm text-muted"><p>{error}</p><button type="button" className="mt-4 rounded-lg bg-accent px-4 py-2 text-ink" onClick={loadData}>Tentar novamente</button></div>) : loading ? (
          <div className="p-16 text-center text-muted text-xs space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-accent-ink" />
            <p>Carregando processos...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-16 text-center text-muted text-xs space-y-2">
            <p className="text-ink font-semibold text-sm">Nenhum processo encontrado</p>
            <p>Ajuste os filtros de pesquisa acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-surface text-muted text-[11px] font-mono">
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
              <tbody className="divide-y divide-line">
                {filteredCases.map((c) => {
                  const isDefense = c.recommendation === 'DEFESA'
                  const isUrgent = c.recommendation === 'ACORDO URGENTE'

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="hover:bg-surface-hover transition-colors cursor-pointer group"
                    >
                      {/* Case Number & Claimant */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink group-hover:text-accent-ink transition-colors">
                          {c.claimant}
                        </div>
                        <div className="text-[11px] font-mono text-muted mt-0.5 flex items-center gap-1.5">
                          <span>{c.caseNumber}</span>

                        </div>
                      </td>

                      {/* Court & Urgency */}
                      <td className="py-3 px-3 text-ink">
                        <div className="truncate max-w-[160px]" title={c.court}>
                          {c.court || c.state}
                        </div>
                        <div className="text-[10px] text-muted mt-0.5">
                          {c.daysToHearing != null ? c.daysToHearing + ' dias p/ audiência' : 'Audiência não informada'}
                        </div>
                      </td>

                      {/* Claim Value */}
                      <td className="py-3 px-3 font-mono text-ink">
                        R$ {c.claimValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Expected Loss */}
                      <td className="py-3 px-3 font-mono">
                        <span className="text-negative font-medium">
                          {c.expectedLoss == null ? '—' : 'R$ ' + c.expectedLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <div className="text-[10px] text-muted">
                          {c.lossProbability == null ? 'Indisponível' : 'P(derrota): ' + Math.round(c.lossProbability * 100) + '%'}
                        </div>
                      </td>

                      {/* Recommendation Tag (Sleek & Flat) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              isDefense
                                ? 'bg-positive'
                                : isUrgent
                                ? 'bg-negative'
                                : 'bg-accent-soft'
                            }`}
                          />
                          <span
                            className={`font-semibold text-[11px] ${
                              isDefense
                                ? 'text-positive'
                                : isUrgent
                                ? 'text-negative'
                                : 'text-accent-ink'
                            }`}
                          >
                            {c.recommendation || 'Indisponível'}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted truncate max-w-[140px] mt-0.5">
                          {c.reasoningCode}
                        </div>
                      </td>

                      {/* Subsidies Micro-indicators */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span
                            className={`px-1 py-0.5 rounded ${
                              c.subsidies.contract.ok
                                ? 'text-positive bg-positive-soft'
                                : 'text-negative bg-negative-soft'
                            }`}
                          >
                            CCB
                          </span>
                          <span
                            className={`px-1 py-0.5 rounded ${
                              c.subsidies.bankStatement.ok
                                ? 'text-positive bg-positive-soft'
                                : 'text-negative bg-negative-soft'
                            }`}
                          >
                            EXTRATO
                          </span>
                          <span
                            className={`px-1 py-0.5 rounded ${
                              c.subsidies.bacen.ok
                                ? 'text-positive bg-positive-soft'
                                : 'text-negative bg-negative-soft'
                            }`}
                          >
                            CRÉDITO
                          </span>
                        </div>
                      </td>

                      {/* Settlement Target */}
                      <td className="py-3 px-3 font-mono">
                        {!c.settlementPricing || isDefense ? (
                          <span className="text-muted text-[11px]">—</span>
                        ) : (
                          <div>
                            <span className="text-ink font-medium">
                              R$ {c.settlementPricing.target.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <div className="text-[10px] text-muted">
                              Teto: R$ {c.settlementPricing.ceiling.toLocaleString('pt-BR')}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/workspace/${c.id}`}
                          className="inline-flex items-center gap-1 text-muted hover:text-ink font-medium text-xs py-1 px-2 rounded hover:bg-surface-hover transition-colors"
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
        <div className="p-4 rounded-lg border border-line bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-muted">Diagnóstico Selecionado</span>
            <p className="font-semibold text-ink">{selectedCase.reasoningTitle}</p>
            <p className="text-muted max-w-2xl leading-relaxed">{selectedCase.reasoningDescription}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSelectedCase(null)}
              className="px-3 py-1.5 text-muted hover:text-ink"
            >
              Fechar
            </button>
            <Link
              to={`/workspace/${selectedCase.id}`}
              className="px-3.5 py-1.5 bg-accent hover:bg-accent text-ink font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
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
