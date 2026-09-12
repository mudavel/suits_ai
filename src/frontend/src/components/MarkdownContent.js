import { createElement, memo, useId } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function MarkdownLink({ href, title, children, id, className, 'aria-label': ariaLabel }) {
  if (!href) return createElement('span', null, children)
  const opensTab = !href.startsWith('#')
  return createElement('a', {
    href, title, id, className, 'aria-label': ariaLabel,
    ...(opensTab ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
  }, children)
}

function MarkdownTable({ children }) {
  return createElement('div', {
    className: 'markdown-table-scroll', role: 'region',
    'aria-label': 'Tabela na resposta', tabIndex: 0,
  }, createElement('table', null, children))
}

// Generated images stay as text: reading a response should not request remote media.
function MarkdownImage({ alt }) {
  return createElement('span', { className: 'text-muted' }, alt ? `[Imagem: ${alt}]` : '[Imagem]')
}

// Present known field references in older replies without changing the stored
// response, source excerpts, or literal fenced blocks.
const fieldReferences = {
  case: 'dados do processo', case_id: 'processo', sources: 'fontes documentais',
  source_ids: 'referências documentais', extra: 'informações complementares',
  policy: 'diretrizes de atuação', confidence_score: 'índice informado',
  settlement_amount: 'valor do acordo', override_reason: 'justificativa',
  content_markdown: 'texto da minuta',
}
function MarkdownCode({ children, className }) {
  const label = typeof children === 'string' && !className && Object.hasOwn(fieldReferences, children) ? fieldReferences[children] : null
  return label ? createElement('span', null, label) : createElement('code', { className }, children)
}

const components = { a: MarkdownLink, table: MarkdownTable, img: MarkdownImage, code: MarkdownCode }
const remarkPlugins = [remarkGfm]

const MarkdownContent = memo(function MarkdownContent({ children }) {
  const id = useId()
  return createElement('div', { className: 'markdown-content' },
    createElement(ReactMarkdown, {
      remarkPlugins, components, skipHtml: true,
      // Scope footnotes to this response when multiple messages use the same labels.
      remarkRehypeOptions: { clobberPrefix: `markdown-${id}-`, footnoteLabel: 'Notas', footnoteBackLabel: 'Voltar à referência' },
    }, children ?? ''),
  )
})

export default MarkdownContent
