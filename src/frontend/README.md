# Frontend — Suits AI

React 19, JavaScript/JSX, Vite 8, Tailwind CSS 4, React Router 7 e Lucide. Estado local com hooks e Context; sem dependência adicional para chat, Markdown ou exportação de PDF.

## Executar

Na raiz do repositório, inicie o backend conforme [as instruções da API](../backend/README.md). Depois:

```powershell
cd src/frontend
npm ci
npm run dev -- --host 127.0.0.1
```

A interface fica em http://127.0.0.1:5173. O Vite encaminha `/api` para http://127.0.0.1:8000. Para testar outra instância, defina `SUITS_API_PROXY_TARGET` no processo do Vite antes de iniciá-lo. Essa variável só configura o proxy do servidor; não contém chave de IA.

Em produção, sirva o build e a API na mesma origem, encaminhando `/api` ao FastAPI e as rotas da interface ao `index.html`. `vite preview` serve para conferir o build e não substitui esse proxy de produção.

## Fluxos integrados

- **Triagem:** paginação e filtros de status/UF na API, com todas as 27 UFs. Busca textual, recomendação e ordenação são aplicadas apenas à página carregada, como indicado nos rótulos. A API atual não oferece busca global por texto.
- **Parecer:** recupera a última análise ao abrir o caso; só gera novamente por ação do usuário. Pareceres históricos não definem a política atual. O significado de `confidence_score` é respeitado, sem inversão nem inferência de probabilidade.
- **Documentos e cenários:** consulta texto por página, PDF original e fontes com links para a página citada. Cenários são gerados explicitamente e não têm endpoint de recuperação no backend.
- **Copiloto:** recupera conversas salvas e as últimas 20 mensagens de cada sessão. O envio usa o mesmo `session_id` ao continuar uma conversa; novas conversas são criadas explicitamente.
- **Minutas:** defesa ou acordo, com formato formal ou mensagem para WhatsApp nos acordos. Recupera minutas salvas; o editor envia o texto revisado ao exportador PDF. O original permanece no banco. As edições ainda não exportadas ficam apenas na tela e são identificadas como tal.
- **Decisões:** consulta de faixa, justificativa para divergência, revisão dos dados e confirmação para concluir. Solicita identificadores de advogado/escritório, envia versão e parecer atuais, preserva a chave e o corpo de tentativas repetidas e bloqueia o envio após 409 até atualizar o caso. A tentativa pendente também é guardada no `sessionStorage`, quando disponível.
- **Governança:** contagens, inventário documental e histórico paginado de decisões. Aderência e efetividade continuam identificadas como pendentes quando a própria API retorna `pending_integration`.

Conversas, minutas e decisões têm navegação por páginas de 20 registros. O backend não garante um snapshot entre páginas durante gravações concorrentes; atualizar o histórico consulta novamente a página.

A listagem básica não incorpora a política persistida. Por isso, a triagem consulta o parecer salvo de cada caso da página, com até seis consultas simultâneas, sem gerar análises. Falhas parciais são identificadas e não preenchem recomendações fictícias.

## Comportamento de rede e limites

Consultas usam timeout de 15 segundos; gerações, 5 minutos, para acomodar tentativas do backend. Não há retry automático de POST nem fallback para dados fictícios. Se uma conexão cair durante uma gravação, a interface orienta consultar o histórico: abortar a espera do navegador não desfaz o trabalho no servidor. Falhas 404, 409, 422, 502 e 503 têm tratamento explícito.

O seletor de perfis é uma demonstração, não autenticação. O backend continua responsável pelos dados e pela política; a interface não ativa B1, calcula indicadores de B4 ou altera a configuração de IA. Os modos `local`, `openai` e `mock` são identificados nas respostas. A identidade visual está documentada em [VISUAL_IDENTITY.md](VISUAL_IDENTITY.md).

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
