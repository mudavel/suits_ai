import MarkdownContent from '../MarkdownContent'
import { Sources } from './Shared'

export default function ScenariosPanel({ caseId, analysis }) {
  const author = analysis?.author_arguments || []
  const defense = analysis?.defense_arguments || []
  if (!author.length && !defense.length) return null
  return <details className="analysis-comparison">
    <summary>Argumentos considerados no parecer</summary>
    <div className="space-y-5 pt-5">
      <p className="text-xs text-muted">Este confronto integra a avaliação salva e será usado como contexto na preparação da minuta.</p>
      <div className="grid sm:grid-cols-2 gap-6">{[['Alegações do autor', author], ['Respostas possíveis da defesa', defense]].map(([title, items]) => <section key={title}><h3 className="text-sm font-semibold mb-4">{title}</h3><div className="space-y-4">{items.map((argument, i) => <article key={i}><MarkdownContent>{argument.text}</MarkdownContent><Sources caseId={caseId} items={argument.sources} /></article>)}</div></section>)}</div>
    </div>
  </details>
}
