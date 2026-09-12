# Identidade visual do Suits AI

Referência inspecionada em 12/09/2026: [site público da Enter](https://www.getenter.ai/).

A aplicação mantém o nome Suits AI e adota a linguagem visual da referência: fundo branco, texto preto, títulos serifados leves, controles em sans-serif, linhas discretas e ações em âmbar. O símbolo tipográfico do Suits AI é uma interpretação para esta interface; não substitui os arquivos oficiais da marca Enter.

| Papel | Valor |
|---|---|
| Fundo | `#FFFFFF` |
| Superfícies | `#F7F7F5` |
| Texto principal | `#171715` |
| Texto secundário | `#62625D` |
| Bordas | `#E6E6E1` |
| Ação primária | `#FFAE35`, observado no CTA do site da Enter |
| Texto sobre âmbar | `#171715` |
| Destaques sobre branco | `#835009`, escolhido para manter contraste |
| Títulos | Noto Serif, pesos 300–400 |
| Interface | Geist, pesos 100–900 |

As cores semânticas, fontes e estilos compartilhados estão em `src/index.css`, usando tokens do Tailwind 4. Componentes novos devem usar `ink`, `muted`, `line`, `surface`, `accent` e as cores semânticas de estado. Verde/vermelho ficam reservados para presença/ausência e resultados, sem substituir a indicação textual.

As duas fontes são carregadas dos arquivos WOFF2 públicos usados pelo site de referência. `font-display: swap` e os fallbacks Arial/Georgia permitem uso se o CDN estiver indisponível. Nenhuma nova dependência de pacote foi adicionada. A disponibilidade do CDN é uma dependência visual; antes de publicar, pode-se empacotar versões locais com os arquivos de licença correspondentes.

O componente `src/components/Brand/Brand.jsx` concentra a assinatura gráfica. A tela de entrada, título da página, favicon e navegação usam Suits AI. Nomes de autores e réus continuam vindo dos documentos/da API, sem serem renomeados pela identidade visual.

O login é um seletor de perfis de demonstração. Não representa autenticação. A seleção usa botões, foco visível e navegação por teclado. O cabeçalho mantém navegação em telas pequenas, menu de perfil com fechamento por Escape/clique externo e link para pular ao conteúdo. O layout respeita preferência por movimento reduzido.

A interface consome os dados da API, com paginação e filtros de status/UF no servidor. Busca, recomendação, ordenação e exposição referem-se à página carregada, conforme indicado na tela. Não há fallback automático para casos fictícios.

Pareceres, documentos, cenários, conversas, minutas e decisões estão conectados aos endpoints do backend. Gerações só ocorrem por ação explícita; abrir o workspace recupera os dados já salvos. A governança mostra contagens, inventário e decisões da operação, preservando os indicadores ainda indisponíveis como ausentes. Os contratos e limites estão no [README do frontend](README.md). A planilha de 60 mil casos não é processada por essa interface.

Validação local:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

Os testes do cliente HTTP usam fetch simulado e não acessam backend, SQLite ou provedores de IA.
