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

Para verificar as telas com os dados existentes, foram corrigidas apenas as leituras básicas de lista/detalhe e overview: envelope `items`, nomes e valores em snake_case, erros explícitos, nulos e documentos originais. O frontend não faz fallback automático para casos fictícios. A triagem nesta etapa mostra a primeira página retornada pela API; paginação operacional completa continua na integração planejada. O indicador de processos exibidos e a exposição referem-se à página carregada.

Geração de minutas, chat, cenários e decisões continuam pendentes de integração. Os controles indisponíveis são identificados como tal, sem respostas fabricadas e sem chamadas pagas automáticas. A governança inicia com dados do overview; valores ilustrativos só aparecem após selecionar “Explorar simulação”. Essa simulação não processa a planilha de 60 mil casos.

Validação local:

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

Os testes do cliente HTTP usam fetch simulado e não acessam backend, SQLite ou provedores de IA.
