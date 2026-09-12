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
  Eye,
  Briefcase,
  Download,
  AlertCircle
} from 'lucide-react'
import { fetchCases } from '../../services/api'

export default function CaseSelectionPage() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockData, setIsMockData] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [stateFilter, setStateFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('RISK_DESC')
  const [selectedCaseIds, setSelectedCaseIds] = useState([])
  const [previewCase, setPreviewCase] = useState(null)

  // Carrega casos da API ou Mock
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

  // Filtragem e ordenação computadas
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
        if (sortBy === 'RISK_ASC') return a.expectedLoss - b.expectedLoss
        if (sortBy === 'CLAIM_DESC') return b.claimValue - a.claimValue
        if (sortBy === 'HEARING_ASC') return a.daysToHearing - b.daysToHearing
        return a.id - b.id
      })
  }, [cases, searchTerm, statusFilter, stateFilter, sortBy])

  // Métricas agregadas para os KPI Cards
  const stats = useMemo(() => {
    const total = cases.length
    const defense = cases.filter((c) => c.recommendation === 'DEFESA').length
    const urgent = cases.filter((c) => c.recommendation === 'ACORDO URGENTE').length
    const agreement = cases.filter((c) => c.recommendation === 'ACORDO').length
    const totalExposure = cases.reduce((acc, c) => acc + (c.claimValue || 0), 0)
    const totalExpectedLoss = cases.reduce((acc, c) => acc + (c.expectedLoss || 0), 0)
    return { total, defense, urgent, agreement, totalExposure, totalExpectedLoss }
  }, [cases])

  // Controle de seleção em lote
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCaseIds(filteredCases.map((c) => c.id))
    } else {
      setSelectedCaseIds([])
    }
  }

  const handleToggleSelect = (id) => {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Triagem Inteligente de Processos
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                isMockData
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
              title={isMockData ? 'Consumindo base mockada dos Casos Oficiais Unicamp' : 'Conectado diretamente ao FastAPI'}
            >
              {isMockData ? '⚡ Fila SDD: Casos Oficiais Hackathon' : '🟢 API FastAPI Conectada'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Classificação automatizada pela <strong>Engine Híbrida</strong> (Regras de Subsídios + Random Forest Calibrado)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Fila
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Exposure & Risk */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Fila em Análise</span>
            <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
              {stats.total} casos
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <div className="bg-slate-50 p-2 rounded-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Valor em Causa</p>
              <p className="text-base font-black text-slate-900 mt-0.5">
                R$ {(stats.totalExposure / 1000).toFixed(1)}k
              </p>
            </div>
            <div className="bg-rose-50 p-2 rounded-lg border border-rose-200/60">
              <p className="text-[10px] uppercase font-bold text-rose-600">Total em Risco</p>
              <p className="text-base font-black text-rose-600 mt-0.5">
                R$ {(stats.totalExpectedLoss / 1000).toFixed(1)}k
              </p>
            </div>
          </div>
        </div>

        {/* Defense */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold uppercase">
            <span>Recomendação: Defesa</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{stats.defense} casos</span>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
              {stats.total > 0 ? Math.round((stats.defense / stats.total) * 100) : 0}% da fila
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Subsídios 100% íntegros (3/3)
          </p>
        </div>

        {/* Acordo Urgente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold uppercase">
            <span>Acordo Urgente</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600">{stats.urgent} casos</span>
            <span className="text-xs font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded">
              Prioridade Máxima
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dossiê Não Conforme ou TED Terceiro
          </p>
        </div>

        {/* Agreement / Gray Zone */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase">
            <span>Acordo Negociável</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{stats.agreement} casos</span>
            <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
              Zona Cinzenta
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Classificado por Random Forest
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nº do CNJ, nome do autor, CPF ou comarca..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas Recomendações</option>
              <option value="DEFESA">🟢 Somente Defesa</option>
              <option value="ACORDO">🟡 Somente Acordo</option>
              <option value="ACORDO URGENTE">🔴 Somente Acordo Urgente</option>
            </select>

            {/* State Filter */}
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todas UFs</option>
              <option value="MA">MA (São Luís)</option>
              <option value="AM">AM (Manaus)</option>
              <option value="SP">SP (Campinas / SP)</option>
              <option value="RJ">RJ (Rio de Janeiro)</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="RISK_DESC">Maior E[Perda]</option>
              <option value="RISK_ASC">Menor E[Perda]</option>
              <option value="CLAIM_DESC">Maior Valor da Causa</option>
              <option value="HEARING_ASC">Audiência Mais Próxima</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary if filtered */}
        {(statusFilter !== 'ALL' || stateFilter !== 'ALL' || searchTerm) && (
          <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>Filtros ativos:</span>
            {statusFilter !== 'ALL' && (
              <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                Status: {statusFilter}
              </span>
            )}
            {stateFilter !== 'ALL' && (
              <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                UF: {stateFilter}
              </span>
            )}
            {searchTerm && (
              <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-700">
                Termo: "{searchTerm}"
              </span>
            )}
            <button
              onClick={() => {
                setStatusFilter('ALL')
                setStateFilter('ALL')
                setSearchTerm('')
              }}
              className="text-blue-600 hover:underline font-semibold ml-2"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800">
              Fila de Processos ({filteredCases.length})
            </h2>
            {selectedCaseIds.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                {selectedCaseIds.length} selecionados
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500">
            Clique em um caso para prévia rápida ou no botão para ver mais detalhes
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-sm">Carregando e classificando processos...</p>
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-base font-bold text-slate-700">Nenhum processo encontrado</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nenhum caso atende aos filtros de busca especificados. Tente remover os filtros ou buscar por outro termo.
            </p>
            <button
              onClick={() => {
                setStatusFilter('ALL')
                setStateFilter('ALL')
                setSearchTerm('')
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-blue-700"
            >
              Limpar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left">
              <thead className="bg-slate-50 text-slate-600 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredCases.length > 0 &&
                        selectedCaseIds.length === filteredCases.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-5 py-3">Autor & Processo (CNJ)</th>
                  <th className="px-4 py-3">Comarca</th>
                  <th className="px-4 py-3">Valor Causa</th>
                  <th className="px-4 py-3">E[Perda] & Risco</th>
                  <th className="px-4 py-3">Recomendação EnterOS</th>
                  <th className="px-4 py-3">Dossiê Probatório</th>
                  <th className="px-4 py-3">Régua de Acordo</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCases.map((c) => {
                  const isSelected = selectedCaseIds.includes(c.id)
                  const isDefense = c.recommendation === 'DEFESA'
                  const isUrgent = c.recommendation === 'ACORDO URGENTE'

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isSelected ? 'bg-blue-50/40' : ''
                      }`}
                      onClick={() => setPreviewCase(c)}
                    >
                      {/* Checkbox */}
                      <td
                        className="px-4 py-3.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(c.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Claimant (Destaque) & Código do Processo (Em baixo) */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900 text-sm tracking-tight">{c.claimant}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                          <span>{c.caseNumber}</span>
                          <span className="text-slate-300">•</span>
                          <span>CPF {c.claimantCpf}</span>
                        </div>
                      </td>

                      {/* Court & Hearing urgency */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-800 font-medium truncate max-w-[170px]" title={c.court}>
                          {c.court}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Audiência em {c.daysToHearing} dias</span>
                        </div>
                      </td>

                      {/* Claim Value */}
                      <td className="px-4 py-3.5">
                        <div className="font-black text-slate-900 text-sm tracking-tight">
                          <span className="text-[11px] font-semibold text-slate-400 mr-0.5">R$</span>
                          {c.claimValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">
                          Valor da Ação
                        </div>
                      </td>

                      {/* Expected Loss & Probability (Destaque em Risco) */}
                      <td className="px-4 py-3.5">
                        <div className="inline-flex flex-col bg-rose-50/90 border border-rose-200/90 px-2.5 py-1.5 rounded-lg shadow-2xs">
                          <div className="font-black text-rose-700 text-sm tracking-tight flex items-baseline">
                            <span className="text-[10px] font-bold text-rose-400 mr-0.5">R$</span>
                            {c.expectedLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] font-bold text-rose-600 flex items-center justify-between gap-1.5 mt-0.5">
                            <span>{Math.round(c.lossProbability * 100)}% perda</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                          </div>
                        </div>
                      </td>

                      {/* Recommendation Badge */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isDefense
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isUrgent
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isDefense && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                          {isUrgent && <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />}
                          {!isDefense && !isUrgent && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                          {c.recommendation}
                        </span>
                      </td>

                      {/* Subsidies Chain Progress */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              c.subsidies.contract?.ok ? 'bg-emerald-500' : 'bg-rose-400'
                            }`}
                            title={`Contrato: ${c.subsidies.contract?.ok ? 'OK' : 'Pendente'}`}
                          />
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              c.subsidies.bankStatement?.ok ? 'bg-emerald-500' : 'bg-rose-400'
                            }`}
                            title={`TED: ${c.subsidies.bankStatement?.ok ? 'OK' : 'Pendente'}`}
                          />
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              c.subsidies.bacen?.ok ? 'bg-emerald-500' : 'bg-rose-400'
                            }`}
                            title={`BACEN: ${c.subsidies.bacen?.ok ? 'OK' : 'Pendente'}`}
                          />
                          <span className="text-[11px] font-semibold text-slate-600 ml-1.5">
                            {c.subsidiesStatus}
                          </span>
                        </div>
                      </td>

                      {/* Settlement Range Target */}
                      <td className="px-4 py-3.5">
                        <div className="text-slate-700">
                          <span className="text-[11px] text-slate-400">Alvo: </span>
                          <strong className="text-amber-700">
                            R$ {c.settlementPricing?.target.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                          </strong>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Teto: R$ {c.settlementPricing?.ceiling.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-5 py-3.5 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewCase(c)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Visualização Rápida"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/workspace/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-xs"
                          >
                            Ver Mais
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedCaseIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-4 z-40 animate-in fade-in slide-in-from-bottom-3">
          <div className="text-xs font-medium">
            <strong className="text-blue-400 font-bold">{selectedCaseIds.length}</strong> processos selecionados
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => alert(`Exportando ${selectedCaseIds.length} processos selecionados para relatório executivo...`)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Lote
            </button>
            <button
              onClick={() => setSelectedCaseIds([])}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Quick Drawer / Modal de Prévia Rápida */}
      {previewCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 flex flex-col space-y-5 overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Prévia Rápida do Processo
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {previewCase.claimant}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {previewCase.caseNumber} • CPF {previewCase.claimantCpf}
                </p>
              </div>
              <button
                onClick={() => setPreviewCase(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recommendation Card */}
            <div className="p-4 rounded-xl border bg-slate-50 border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase">Diagnóstico EnterOS</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    previewCase.recommendation === 'DEFESA'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : previewCase.recommendation === 'ACORDO URGENTE'
                      ? 'bg-rose-50 text-rose-800 border-rose-300'
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}
                >
                  {previewCase.recommendation}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800">{previewCase.reasoningTitle}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                {previewCase.reasoningDescription}
              </p>
            </div>

            {/* Financial Risk & Settlement Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[11px] text-slate-500 font-medium">Valor da Causa</span>
                <p className="text-sm font-bold text-slate-800 mt-0.5">
                  R$ {previewCase.claimValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-[11px] text-rose-700 font-medium">Custo Esperado E[Perda]</span>
                <p className="text-sm font-bold text-rose-800 mt-0.5">
                  R$ {previewCase.expectedLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Checklist of Subsidies */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Higidez Probatória dos Subsídios
              </h4>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start gap-2.5">
                  {previewCase.subsidies?.contract?.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="text-slate-800">1. Contrato Digital</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {previewCase.subsidies?.contract?.detail}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start gap-2.5">
                  {previewCase.subsidies?.bankStatement?.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="text-slate-800">2. Comprovante de TED / Crédito</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {previewCase.subsidies?.bankStatement?.detail}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 bg-white flex items-start gap-2.5">
                  {previewCase.subsidies?.bacen?.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <strong className="text-slate-800">3. Histórico BACEN / SCR</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {previewCase.subsidies?.bacen?.detail}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action to Full Details */}
            <div className="pt-4 mt-auto border-t border-slate-200">
              <Link
                to={`/workspace/${previewCase.id}`}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
              >
                Ver Mais Detalhes (Autos & Subsídios)
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
