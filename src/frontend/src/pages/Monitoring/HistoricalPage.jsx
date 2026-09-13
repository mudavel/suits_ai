import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Table2, X } from 'lucide-react'
import { fetchHistoricalCases } from '../../services/api'
import { money } from '../../services/workflow'
import { useRemote } from '../../hooks/useRemote'
import { Busy, ErrorNotice } from '../../components/Workspace/Shared'

const subsidyColumns = [
  ['contract', 'Contrato'], ['statement', 'Extrato'], ['credit_receipt', 'Comprovante de crédito'],
  ['dossier', 'Dossiê'], ['debt_evolution', 'Demonstrativo de evolução da dívida'], ['referenced_report', 'Laudo referenciado'],
]
const columns = [
  ['case_number', 'Número do processo'], ['uf', 'UF'], ['subject', 'Assunto'], ['sub_subject', 'Sub-assunto'],
  ['macro_result', 'Resultado macro'], ['micro_result', 'Resultado micro'], ['cause_value', 'Valor da causa'],
  ['condemnation_value', 'Condenação / indenização'], ['subsidy_count', 'Subsídios'], ...subsidyColumns,
]
const initial = { page: 1, page_size: 50, q: '', uf: '', subject: '', sub_subject: '', macro_result: '', micro_result: '', subsidy: '', presence: 'provided', sort: 'source_row', direction: 'asc' }
const count = value => value?.toLocaleString('pt-BR') ?? '—'
const presenceLabel = value => value === 1 ? 'Fornecido' : value === 0 ? 'Não fornecido' : 'Não informado'
const isMoney = field => ['cause_value', 'condemnation_value'].includes(field)
const display = (item, field) => isMoney(field) ? money(item[field]) : field === 'subsidy_count' ? `${item[field]} de 6` : item[field] ?? 'Não informado'

function CaseDetail({ item, source, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])
  return <dialog ref={dialog} className="historical-dialog" aria-labelledby="historical-case-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="section-heading"><div><p className="eyebrow">PROCESSO HISTÓRICO</p><h2 id="historical-case-title">{item.case_number}</h2></div><button type="button" className="button-secondary" aria-label="Fechar detalhes" onClick={onClose}><X size={18} /></button></div>
    <p className="text-xs text-muted mt-3">Registro da planilha original · consulta caso a caso</p>
    <dl className="historical-detail-grid">{columns.slice(1, 8).map(([field, label]) => <div key={field}><dt>{label}</dt><dd>{display(item, field)}</dd></div>)}</dl>
    <div className="section-heading mb-3"><h3 className="text-sm font-medium">Subsídios disponibilizados</h3><span className="text-xs text-muted">{item.subsidy_count} de 6 fornecidos</span></div>
    <div className="historical-detail-subsidies">{subsidyColumns.map(([field, label]) => <div key={field}><span>{label}</span><span className={item[field] ? 'historical-provided' : 'text-muted'}>{presenceLabel(item[field])}</span></div>)}</div>
    <p className="text-xs text-muted mt-5 leading-relaxed">A planilha informa a disponibilidade dos subsídios; os documentos destes processos históricos não estão anexados a este registro.</p>
    <div className="historical-source"><p>{source.source}</p><p>“{source.result_sheet}” · linha {item.source_row}</p><p>“{source.subsidy_sheet}” · linha {item.subsidy_row}</p></div>
  </dialog>
}

export default function HistoricalPage() {
  const [filters, setFilters] = useState(initial)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  // Keep filter choices visible while the next page is loading.
  const [catalog, setCatalog] = useState(null)
  const resource = useRemote(useCallback(async signal => {
    const response = await fetchHistoricalCases(filters, { signal })
    if (!signal.aborted) setCatalog(response)
    return response
  }, [filters]))
  useEffect(() => {
    const timer = setTimeout(() => setFilters(previous => previous.q === search ? previous : { ...previous, q: search, page: 1 }), 300)
    return () => clearTimeout(timer)
  }, [search])
  const pending = resource.loading || search !== filters.q
  const data = resource.data
  const change = (field, value) => setFilters(previous => ({ ...previous, [field]: value, page: 1 }))
  const clear = () => { setSearch(''); setFilters(initial) }
  const sort = field => setFilters(previous => ({ ...previous, page: 1, sort: field, direction: previous.sort === field && previous.direction === 'asc' ? 'desc' : 'asc' }))
  const activeFilters = search || ['uf', 'subject', 'sub_subject', 'macro_result', 'micro_result', 'subsidy'].some(field => filters[field])
  const page = data?.page ?? filters.page
  const pages = data?.total_pages ?? 1

  return <div className="space-y-6 historical-page">
    <div className="section-heading border-b border-line pb-6"><div><p className="eyebrow mb-2">DIRETORIA JURÍDICA · GOVERNANÇA</p><h1>Base histórica</h1><p className="text-sm text-muted mt-3">Explore os resultados dos processos e os subsídios disponibilizados, caso a caso.</p></div><div className="historical-total"><Table2 size={19} /><div><strong>{count(catalog?.total_cases)}</strong><span>processos na base</span></div></div></div>

    <section aria-label="Filtros da base histórica" className="historical-filters">
      <label className="historical-search"><span className="field-label"><Search size={13} />Buscar em toda a base</span><input type="search" className="field" value={search} onChange={event => setSearch(event.target.value)} placeholder="Número do processo, assunto ou resultado" /></label>
      {[['uf', 'UF', 'Todas as UFs'], ['macro_result', 'Resultado macro', 'Todos os resultados'], ['micro_result', 'Resultado micro', 'Todos os desfechos'], ['subject', 'Assunto', 'Todos os assuntos'], ['sub_subject', 'Sub-assunto', 'Todos os sub-assuntos']].map(([field, label, all]) => <label key={field}><span className="field-label">{label}</span><select className="field" value={filters[field]} onChange={event => change(field, event.target.value)}><option value="">{all}</option>{catalog?.options[field]?.map(value => <option key={value}>{value}</option>)}</select></label>)}
      <label><span className="field-label">Tipo de subsídio</span><select className="field" value={filters.subsidy} onChange={event => change('subsidy', event.target.value)}><option value="">Todos os subsídios</option>{subsidyColumns.map(([field, label]) => <option key={field} value={field}>{label}</option>)}</select></label>
      <label><span className="field-label">Disponibilidade do subsídio</span><select className="field" disabled={!filters.subsidy} value={filters.presence} onChange={event => change('presence', event.target.value)}><option value="provided">Fornecido</option><option value="missing">Não fornecido</option></select></label>
      <button type="button" className="button-secondary self-end" onClick={clear} disabled={!activeFilters}>Limpar filtros</button>
    </section>

    <section aria-label="Planilha de processos históricos" className="space-y-3">
      <div className="section-heading text-xs">
        <p role="status" aria-live="polite">{pending ? 'Consultando base histórica...' : resource.error ? 'Consulta indisponível' : <>
          <strong>{count(data?.total)}</strong> processos encontrados
          {data?.items.length > 0 && ` · exibindo ${count((page - 1) * filters.page_size + 1)}–${count((page - 1) * filters.page_size + data.items.length)}`}
        </>}</p>
        <label className="flex items-center gap-3"><span>Linhas por página</span><select className="field" value={filters.page_size} onChange={event => change('page_size', Number(event.target.value))}>{[25, 50, 100].map(size => <option key={size}>{size}</option>)}</select></label>
      </div>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      {pending ? <Busy>Carregando processos da planilha...</Busy> : !resource.error && (data?.items.length ? <div className="historical-grid" tabIndex={0} role="region" aria-label="Tabela histórica com rolagem horizontal e vertical">
        <table className="historical-table"><caption className="sr-only">Resultados dos processos e seis tipos de subsídios. Selecione o número do processo para ver todos os detalhes. Clique nos cabeçalhos para ordenar toda a base.</caption><thead><tr>{columns.map(([field, label]) => <th key={field} scope="col" aria-sort={filters.sort === field ? filters.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sort(field)}>{label}{filters.sort === field ? filters.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} />}</button></th>)}</tr></thead><tbody>{data.items.map(item => <tr key={item.case_number}>{columns.map(([field]) => <td key={field} className={isMoney(field) ? 'historical-money' : ''}>{field === 'case_number' ? <button className="historical-case-link" type="button" onClick={() => setSelected(item)} aria-label={`Analisar processo ${item.case_number}`}>{item.case_number}</button> : subsidyColumns.some(([key]) => key === field) ? <span className={item[field] ? 'historical-provided' : 'text-muted'}>{presenceLabel(item[field])}</span> : display(item, field)}</td>)}</tr>)}</tbody></table>
      </div> : <div className="panel text-center py-12"><p>Nenhum processo encontrado para os filtros selecionados.</p><button type="button" className="button-secondary mt-4" onClick={clear}>Limpar filtros</button></div>)}
      <nav className="section-heading text-xs" aria-label="Paginação da base histórica"><div className="flex gap-2"><button type="button" className="button-secondary" disabled={pending || !!resource.error || page <= 1} onClick={() => change('page', 1)}>Primeira</button><button type="button" className="button-secondary" disabled={pending || !!resource.error || page <= 1} onClick={() => setFilters(previous => ({ ...previous, page: page - 1 }))}>Anterior</button></div><span>{pending ? 'Carregando...' : resource.error ? 'Paginação indisponível' : `Página ${count(page)} de ${count(pages)}`}</span><div className="flex gap-2"><button type="button" className="button-secondary" disabled={pending || !!resource.error || page >= pages} onClick={() => setFilters(previous => ({ ...previous, page: page + 1 }))}>Próxima</button><button type="button" className="button-secondary" disabled={pending || !!resource.error || page >= pages} onClick={() => setFilters(previous => ({ ...previous, page: pages }))}>Última</button></div></nav>
      <p className="text-xs text-muted">Clique nos cabeçalhos para ordenar e no número do processo para analisar o caso. Deslize a tabela para consultar as demais colunas.</p>
    </section>
    {catalog && <p className="historical-source">Fonte: {catalog.source} · abas “{catalog.result_sheet}” e “{catalog.subsidy_sheet}”. Subsídios: 1 = fornecido; 0 = não fornecido.</p>}
    {selected && <CaseDetail item={selected} source={catalog} onClose={() => setSelected(null)} />}
  </div>
}
