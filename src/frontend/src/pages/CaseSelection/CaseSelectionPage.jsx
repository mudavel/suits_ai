import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, RefreshCw, Search } from 'lucide-react'
import { fetchCases } from '../../services/api'
import { riskLabel } from '../../services/productLanguage'
import { money, statusLabel } from '../../services/workflow'
import { useAuth } from '../../context/AuthContext'
import { useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice } from '../../components/Workspace/Shared'

const states = 'AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO'.split(' ')
const emptyCases = []

export default function CaseSelectionPage() {
  const { currentProfile } = useAuth()
  const [filters, setFilters] = useState({ page: 1, pageSize: 20, status: '', uf: '' })
  const [search, setSearch] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [sort, setSort] = useState('value')
  const resource = useRemote(useCallback(signal => fetchCases({ ...filters, signal, includeAnalysis: true }), [filters]))
  const cases = resource.data?.data || emptyCases
  const filtered = useMemo(() => cases.filter(item => {
    const matches = (item.caseNumber + ' ' + item.claimant).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
    return matches && (!recommendation || (recommendation === 'NONE' ? !item.recommendation : item.recommendation === recommendation))
  }).sort((a, b) => sort === 'value' ? b.claimValue - a.claimValue : a.caseNumber.localeCompare(b.caseNumber)), [cases, search, recommendation, sort])
  const changeFilter = (field, value) => setFilters(previous => ({ ...previous, [field]: value, page: 1 }))
  return <div className="space-y-6">
    <div className="section-heading border-b border-line pb-6"><div><h1>Processos cíveis</h1><p className="text-xs text-muted mt-3">Localize o processo e abra o caso para trabalhar.</p><p className="text-xs text-muted mt-2">{currentProfile.organization}</p></div><p className="text-xs text-muted"><strong className="text-ink">{resource.data?.total ?? '—'}</strong> {resource.data?.total === 1 ? 'processo encontrado' : 'processos encontrados'}</p></div>
    {resource.data?.isMock && <p className="notice">Processos de demonstração.</p>}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <label><span className="field-label">Situação do processo</span><select className="field" value={filters.status} onChange={event => changeFilter('status', event.target.value)}><option value="">Todas as situações</option><option value="PENDENTE">Pendente</option><option value="EM_ANALISE">Em análise</option><option value="CONCLUIDO">Concluído</option></select></label>
      <label><span className="field-label">UF</span><select className="field" value={filters.uf} onChange={event => changeFilter('uf', event.target.value)}><option value="">Todas as UFs</option>{states.map(state => <option key={state}>{state}</option>)}</select></label>
      <label><span className="field-label">Processos por página</span><select className="field" value={filters.pageSize} onChange={event => changeFilter('pageSize', Number(event.target.value))}>{[10, 20, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
      <button type="button" className="button-secondary self-end" disabled={resource.loading} onClick={resource.reload}><RefreshCw size={14} />Atualizar lista</button>
    </div>
    <div className="grid md:grid-cols-3 gap-3">
      <label><span className="field-label flex gap-1 items-center"><Search size={12} />Busca nesta página</span><input className="field" value={search} onChange={event => setSearch(event.target.value)} placeholder="Número do processo ou partes" /></label>
      <label><span className="field-label">Definição nesta página</span><select className="field" value={recommendation} onChange={event => setRecommendation(event.target.value)}><option value="">Todas</option><option value="DEFESA">Defesa</option><option value="ACORDO">Acordo</option><option value="NONE">Indisponível</option></select></label>
      <label><span className="field-label">Ordenar esta página</span><select className="field" value={sort} onChange={event => setSort(event.target.value)}><option value="value">Maior valor da causa</option><option value="number">Número do processo</option></select></label>
    </div>
    <ErrorNotice error={resource.error} retry={resource.reload} />
    {cases.some(item => item.analysisError) && <p className="notice">Não foi possível consultar o parecer de alguns processos. Atualize a lista para recuperar suas recomendações.</p>}
    {resource.loading ? <Busy>Carregando processos...</Busy> : !resource.error && <div className="border border-line rounded-lg overflow-hidden">
      {filtered.length ? <div className="overflow-x-auto"><table className="case-table"><thead><tr>{['Processo e partes', 'UF', 'Situação', 'Valor da causa', 'Definição', 'Documentos presentes', 'Acesso'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{filtered.map(item => <tr key={item.id}><td><Link className="font-medium hover:underline" to={'/workspace/' + item.id}>{item.claimant}</Link><p className="text-[10px] text-muted mt-1">{item.caseNumber}</p></td><td>{item.state}</td><td>{statusLabel(item.status)}</td><td className="whitespace-nowrap">{money(item.claimValue)}{item.expectedLoss != null && <p className="text-[10px] text-muted mt-1">Perda esperada: {money(item.expectedLoss)}</p>}</td><td>{item.analysisError ? 'Falha na consulta' : ({ DEFESA: 'Defesa', ACORDO: 'Acordo' }[item.recommendation] || 'Indisponível')}{item.riskLevel && <p className="text-[10px] text-muted mt-1">Risco: {riskLabel(item.riskLevel)}</p>}</td><td><div className="flex gap-2">{[['Contrato', item.subsidies.contract.ok], ['Extrato', item.subsidies.bankStatement.ok], ['Crédito', item.subsidies.bacen.ok]].map(([label, present]) => <span key={label} className={present ? 'text-positive' : 'text-muted'} title={label + (present ? ' presente' : ' ausente')}>{present ? '✓' : '–'} {label}</span>)}</div></td><td><Link className="inline-flex items-center gap-2" aria-label={'Abrir processo ' + item.caseNumber} to={'/workspace/' + item.id}>Abrir<ArrowRight size={14} /></Link></td></tr>)}</tbody></table></div> : <p className="p-12 text-center text-sm text-muted">{cases.length ? 'Nenhum resultado nesta página. Limpe a busca ou navegue para outra página.' : 'Nenhum processo encontrado para os filtros selecionados.'}</p>}
    </div>}
    <nav aria-label="Paginação dos processos" className="flex flex-wrap items-center justify-between gap-3 text-xs"><button type="button" className="button-secondary" disabled={resource.loading || filters.page === 1} onClick={() => setFilters(previous => ({ ...previous, page: previous.page - 1 }))}>Página anterior</button><span>{resource.error ? 'Lista indisponível' : resource.loading ? 'Carregando página ' + filters.page + '...' : filtered.length + ' exibidos · Página ' + (resource.data?.page || filters.page) + ' de ' + Math.max(1, resource.data?.totalPages || 0)}</span><button type="button" className="button-secondary" disabled={resource.loading || !!resource.error || filters.page >= (resource.data?.totalPages || 0)} onClick={() => setFilters(previous => ({ ...previous, page: previous.page + 1 }))}>Próxima página</button></nav>
  </div>
}
