# Frontend — Enter OS

React 19, JavaScript/JSX, Vite 8, Tailwind CSS 4, React Router 7 e Lucide. Estado local com hooks e Context; renderização de Markdown com react-markdown e remark-gfm. O PDF é exportado pelo backend.

## Executar

Para iniciar API e interface no mesmo terminal, execute na raiz do repositório:

```powershell
python scripts/dev.py --env-file .env
```

O ambiente Python precisa das dependências da raiz e o frontend precisa de `npm ci` na primeira instalação. O script recarrega a API ao alterar Python ou o `.env` selecionado; o Vite atualiza a interface. `Ctrl+C` encerra ambos. As portas padrão são 8000 e 5173; portas ocupadas geram um aviso, sem encerrar processos de terceiros. `--database` permite reutilizar um SQLite existente e `--api-port`/`--web-port` permitem uma instância isolada.

Para executar cada servidor em um terminal separado:

Na raiz do repositório, inicie o backend conforme [as instruções da API](../backend/README.md). Depois:

```powershell
cd src/frontend
npm ci
npm run dev -- --host 127.0.0.1
```

A interface fica em http://127.0.0.1:5173. O Vite encaminha `/api` para http://127.0.0.1:8000. Para testar outra instância, defina `SUITS_API_PROXY_TARGET` no processo do Vite antes de iniciá-lo. Essa variável só configura o proxy do servidor; não contém chave de IA.

Em produção, sirva o build e a API na mesma origem, encaminhando `/api` ao FastAPI e as rotas da interface ao `index.html`. `vite preview` serve para conferir o build e não substitui esse proxy de produção.

## Fluxos integrados

O menu principal separa **Processos**, para trabalhar em um caso, e **Governança**, para supervisionar aderência e efetividade. Dentro do processo, a sequência é **Parecer → Encaminhamento e minuta → Conclusão**, com **Documentos** como área de consulta. Cada aba tem um link direto (`?aba=parecer`, `?aba=encaminhamento`, `?aba=conclusao`, `?aba=documentos`); os links antigos para `decisao` ou `minutas` abrem Conclusão. Trocar de aba preserva a minuta selecionada e suas edições enquanto o processo estiver aberto. O copiloto é aberto sob demanda e preserva a conversa ao ser recolhido.

- **Triagem:** paginação e filtros de status/UF na API, com todas as 27 UFs. Busca textual, definição e ordenação são aplicadas apenas à página carregada, como indicado nos rótulos. A primeira análise muda um caso pendente para **Em análise**; a definição continua **Indisponível** enquanto não houver política atual. A API atual não oferece busca global por texto.
- **Parecer:** recupera a última análise ao abrir o caso; só gera novamente por ação do usuário. Exibe o texto do parecer como resumo do processo em parágrafos: partes, objeto, alegações/pedidos identificados, fatos documentais e ponto central a esclarecer. Novas gerações recebem orientação de 180–260 palavras, sem listas nem detalhes de extração. Pareceres antigos no formato de três seções são condensados na apresentação, sem alterar registros, encaminhamentos ou minutas. Pareceres locais usam os dados identificados do caso, sem rotular a síntese como redação por IA. Pareceres históricos não definem a política atual. O significado de `confidence_score` é respeitado, sem inversão nem inferência de probabilidade.
- **Documentos:** reúne autos, subsídios e verificações documentais. Os filtros selecionam a categoria; cada item dá acesso à transcrição por página e ao PDF original. As citações mantêm links para a página consultada.
- **Argumentos das partes:** continuam persistidos com suas fontes para fundamentar a minuta, mas não ampliam o resumo exibido no parecer. Na elaboração da peça, o backend envia parecer, argumentos, fontes e encaminhamento ao gerador. Pareceres antigos sem argumentos estruturados continuam acessíveis.
- **Copiloto:** recupera conversas salvas e as últimas 20 mensagens de cada sessão. O envio usa o mesmo `session_id` ao continuar uma conversa; novas conversas são criadas explicitamente.
- **Encaminhamento e minuta:** um único botão **Gerar minuta** salva a escolha de defesa ou acordo e gera o documento formal, abrindo seu texto para revisão e exportação em PDF. Um encaminhamento atual já salvo pode ser reutilizado sem nova gravação. A interface explica piso, alvo, teto e perda esperada e exige justificativa para divergência da política ou valor acima do teto. Se a geração falhar após salvar, informa o estado parcial e orienta consultar o histórico, sem repetição automática. Edições de uma minuta são preservadas e bloqueiam nova geração até serem descartadas ou concluídas. O contrato HTTP ainda aceita o formato legado de mensagem para compatibilidade, mas a interface não o oferece.
- **Conclusão:** registra a versão exata da minuta junto do advogado selecionado em uma lista demonstrativa e do escritório correspondente. A confirmação mantém chave e corpo em tentativas repetidas e bloqueia após 409 até atualizar; a tentativa pendente também fica no `sessionStorage`, quando disponível.
- **Governança:** exibe a base histórica de 60 mil linhas, separa comparações descritivas de métricas ainda indisponíveis e apresenta aderência por advogado e escritório. Essa seção consulta `/api/monitoring/lawyers`: os dados são mockados, persistidos no SQLite e sempre identificados como demonstração, sem agregação das decisões operacionais. Para popular a base existente, execute `python scripts/seed_governance_demo.py --database CAMINHO_DO_BANCO` na raiz do projeto. O script cria backup e faz upsert apenas dos cinco advogados demonstrativos e seus escritórios, preservando processos e decisões.
- **Lacunas documentais:** aparece ao lado da visão por advogado, em duas colunas iguais no desktop e empilhadas no celular. Usa `src/data/historicalSubsidies.json`, apurado dos 60.000 processos únicos da aba `Subsídios disponibilizados`, e não o inventário operacional da API. `python scripts/summarize_historical_subsidies.py` reproduz o snapshot a partir da planilha original; o teste reconcilia o JSON com a fonte. Ausência é valor 0, presença é 1 e as chaves precisam corresponder integralmente à aba de resultados.
- **Fundamentação da política no parecer:** “Como a política chega à definição” condensa a avaliação salva em parágrafos, sem repetir os mesmos motivos em listas de passos, fatores e regras. Na documentação completa, reúne documentos essenciais e demonstrativo da dívida quando efetivamente registrado; na avaliação estatística, preserva a estimativa, os critérios selecionados e o limite de acordo informado. Não recalcula a decisão nem fabrica critérios ausentes. Mantém ressalva única, identificação de parecer anterior, demonstração ou estimativa alternativa e não apresenta taxas históricas fixas sem amostra como previsão individual.
- **Observabilidade:** a linha do tempo do processo mostra início, parecer, oferta, contraproposta e conclusão como eventos demonstrativos. A interface identifica explicitamente que a fonte original não contém esses timestamps.

Conversas, minutas e decisões têm navegação por páginas de 20 registros. O backend não garante um snapshot entre páginas durante gravações concorrentes; atualizar o histórico consulta novamente a página.

Um novo parecer invalida o encaminhamento anterior mesmo sem mudança de versão do processo. Um novo encaminhamento exige nova minuta para concluir. A API verifica esses vínculos antes e depois da geração, e novamente na transação de conclusão. Documentos históricos permanecem consultáveis e exportáveis. Os contratos antigos de geração e decisão continuam aceitos para compatibilidade; a interface usa o fluxo com vínculos obrigatórios. Se a API for iniciada sem `scripts/dev.py`, reinicie o servidor Python ao alterar sua configuração; o HMR do Vite atualiza apenas a interface.

A listagem básica não incorpora a política persistida. Por isso, a triagem consulta o parecer salvo de cada caso da página, com até seis consultas simultâneas, sem gerar análises. Falhas parciais são identificadas e não preenchem recomendações fictícias.

Pareceres, respostas do copiloto, cenários e avisos gerados são renderizados em Markdown, incluindo listas, tabelas e blocos de código. As minutas têm uma prévia formatada do texto atual do editor. A renderização preserva o conteúdo salvo, ignora HTML bruto e mantém o filtro de URLs do react-markdown; imagens aparecem como texto alternativo.

## Comportamento de rede e limites

Consultas usam timeout de 15 segundos; gerações, 5 minutos, para acomodar tentativas do backend. Não há retry automático de POST nem fallback para dados fictícios. Se uma conexão cair durante uma gravação, a interface orienta consultar o histórico: abortar a espera do navegador não desfaz o trabalho no servidor. Falhas 404, 409, 422, 502 e 503 têm tratamento explícito.

O seletor de perfis é uma demonstração, não autenticação. O backend continua responsável pelos dados e pela política; a interface não ativa B1, calcula indicadores de B4 ou altera a configuração de IA. Os modos `local`, `openai` e `mock` são identificados nas respostas. A identidade visual está documentada em [VISUAL_IDENTITY.md](VISUAL_IDENTITY.md).

Encaminhamento, geração da peça e conclusão ficam no perfil Advogado. Nas etapas operacionais, os perfis de consulta veem qual perfil está ativo e o botão **Continuar como Advogado**, que troca o perfil da demonstração mantendo o processo e a aba atuais. O cabeçalho também identifica o papel selecionado. O indicador do parecer usa **Confiança na recomendação** ou **Probabilidade estimada de derrota**, conforme o significado retornado pela API; um resultado sem significado conhecido não vira um percentual com rótulo genérico.

## Validar

No diretório do frontend:

```powershell
npm test
npm run lint
npm run build
```

Para testar o cliente JavaScript com a API real, execute na raiz do repositório com o Python do ambiente do backend:

```powershell
python scripts/check_frontend_integration.py
```

O script sobe FastAPI em uma porta livre de loopback, usa SQLite temporário, documentos do dataset e geração local, executa `src/frontend/test/integration.test.js` e valida o conteúdo do PDF exportado com pypdf. Não usa a instância em execução, banco existente ou chamadas de IA. O ambiente precisa das dependências de `requirements.txt` e de Node.js no PATH.
# Base histórica da diretoria

A rota `/base-historica`, disponível na navegação do perfil `BANK`, consulta
`GET /api/monitoring/historical`. A tabela reúne resultados e os seis indicadores
de subsídio do Excel pelo número do processo. Busca, filtros e ordenação se aplicam
à base inteira; a interface recebe apenas 25, 50 ou 100 linhas por página.
O número do processo abre a ficha com todos os campos e as linhas de origem.
A disponibilidade documental não representa anexos para download.
