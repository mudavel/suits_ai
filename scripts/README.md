# Scripts

## Reproduzir o report.html

O código original do relatório em `artefacts/suits_docs/report.html` está em:

- `analyze_cases.py`: lê as duas abas do Excel, confere as chaves, calcula os
  agregados e a validação exploratória, e chama o renderizador.
- `render_analysis.py`: gera o relatório HTML e o Markdown a partir de `profile.json`.
- `requirements-analysis.txt`: versões das dependências da análise.

Na raiz do repositório, em um ambiente Python dedicado:

```powershell
python -m pip install -r scripts/requirements-analysis.txt
python scripts/analyze_cases.py "artefacts/Hackaton Unicamp/Hackaton_Enter_Base_Candidatos.xlsx" --output-dir artefacts/suits_docs/analysis
```

A pasta de saída recebe `report.html`, `README.md`, `profile.json` e as tabelas
agregadas em CSV. Ela também é o destino padrão quando `--output-dir` é omitido.
O Excel é somente lido. Os resultados exportados não contêm os identificadores
individuais dos processos. O subdiretório mantém a documentação existente intacta.

Para renderizar novamente os relatórios usando agregados já calculados:

```powershell
python scripts/render_analysis.py artefacts/suits_docs/analysis/profile.json
```

O renderizador grava `report.html` e `README.md` na mesma pasta do `profile.json`.
