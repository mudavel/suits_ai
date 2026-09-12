import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownContent from './MarkdownContent.js'

const render = content => renderToStaticMarkup(createElement(MarkdownContent, null, content))

test('renderiza o formato do parecer e do copiloto sem mostrar os marcadores', () => {
  const html = render('## Parecer documental curto\n\n**Conclusão:** documentos *pendentes*.\n\n- **Contrato** ausente\n- Extrato a conferir\n  - Conta destinatária\n\n1. Revisar documentos\n2. Confirmar informações')
  assert.match(html, /<h2>Parecer documental curto<\/h2>/)
  assert.match(html, /<strong>Conclusão:<\/strong>/)
  assert.match(html, /<em>pendentes<\/em>/)
  assert.match(html, /<ul>/)
  assert.match(html, /<ol>/)
  assert.match(html, /<li>Conta destinatária<\/li>/)
  assert.doesNotMatch(html, /## Parecer|\*\*Conclusão/)
})

test('tabelas GFM ficam em região rolável e listas de tarefas são somente leitura', () => {
  const html = render('| Documento | Situação |\n| --- | --- |\n| Contrato | **Ausente** |\n\n- [x] Autos consultados\n- [ ] Solicitar extrato\n\n~~Texto substituído~~')
  assert.match(html, /class="markdown-table-scroll" role="region" aria-label="Tabela na resposta" tabindex="0"/)
  assert.match(html, /<th>Documento<\/th>/)
  assert.match(html, /<td><strong>Ausente<\/strong><\/td>/)
  assert.match(html, /<input type="checkbox" disabled="" checked=""/)
  assert.match(html, /<del>Texto substituído<\/del>/)
})

test('preserva citações, código e caracteres sem interpretar código como HTML', () => {
  const html = render('> Conferir os autos.\n\nReferência `documento.pdf`.\n\n```html\n<script>alert(1)</script>\n```\n\nR$ 180,00 — José Raimundo.')
  assert.match(html, /<blockquote>/)
  assert.match(html, /<code>documento.pdf<\/code>/)
  assert.match(html, /<pre><code class="language-html">&lt;script&gt;/)
  assert.match(html, /R\$ 180,00 — José Raimundo\./)
  assert.doesNotMatch(html, /<script>/)
})

test('referências internas em respostas antigas recebem rótulos compreensíveis', () => {
  const html = render('Dados de `case` e `sources`. Literal `constructor`.\n\n```\ncase\n```')
  assert.match(html, /Dados de <span>dados do processo<\/span> e <span>fontes documentais<\/span>/)
  assert.match(html, /<pre><code>case\n<\/code><\/pre>/)
  assert.match(html, /<code>constructor<\/code>/)
})

test('HTML bruto e URLs executáveis não viram elementos ativos, imagens não carregam recursos', () => {
  const html = render('<script>alert(1)</script>\n\n<img src="https://example.com/track" onerror="alert(1)">\n\n[Executar](javascript:alert%281%29)\n\n![Diagrama](https://example.com/image.png)')
  assert.doesNotMatch(html, /<script|<img|javascript:|onerror|https:\/\/example.com/)
  assert.match(html, /<span>Executar<\/span>/)
  assert.match(html, /\[Imagem: Diagrama\]/)
})

test('links de documentos e notas continuam utilizáveis e separados por resposta', () => {
  const content = '[PDF original](/api/cases/2/documents/c2-d01/download#page=2)\n\nNota[^1].\n\n[^1]: Conferência documental.'
  const html = renderToStaticMarkup(createElement(Fragment, null,
    createElement(MarkdownContent, null, content),
    createElement(MarkdownContent, null, content),
  ))
  assert.match(html, /href="\/api\/cases\/2\/documents\/c2-d01\/download#page=2" target="_blank" rel="noopener noreferrer"/)
  const noteIds = [...html.matchAll(/id="(markdown-[^"]+-fn-1)"/g)].map(match => match[1])
  assert.equal(noteIds.length, 2)
  assert.notEqual(noteIds[0], noteIds[1])
  for (const id of noteIds) assert.ok(html.includes('href="#' + id + '"'))
  for (const id of noteIds) {
    const referenceId = id.replace('-fn-', '-fnref-')
    assert.ok(html.includes('id="' + referenceId + '"'))
    assert.ok(html.includes('href="#' + referenceId + '"'))
  }
  assert.match(html, /aria-label="Voltar à referência"/)
})
