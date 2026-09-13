"""Render the aggregate analysis as portable Markdown and HTML reports."""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path


MODEL_NAMES = {"global": "Taxa global", "uf": "Somente UF", "documents": "Somente documentos", "controls": "UF, subassunto e valor da causa", "full": "Documentos, UF, subassunto e valor"}
COST_NAMES = {"always_zero": "Sempre zero", "global_mean": "Média histórica", "probability_times_mean_severity": "Risco × condenação média", "two_part_claim_ratio": "Risco × valor condicionado ao caso"}


def number(value, decimals=0):
    return f"{value:,.{decimals}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def percent(value, decimals=1):
    return number(value * 100, decimals) + "%"


def money(value, decimals=0):
    return "R$ " + number(value, decimals)


def yes(value):
    return "Presente" if value else "Ausente"


def markdown_table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join(["---"] * len(headers)) + " |", *["| " + " | ".join(map(str, row)) + " |" for row in rows]])


def html_table(headers, rows, table_id=""):
    head = "".join(f"<th scope=col>{html.escape(str(cell))}</th>" for cell in headers)
    body = "".join("<tr>" + "".join(f"<td>{html.escape(str(cell))}</td>" for cell in row) + "</tr>" for row in rows)
    return f'<div class="table-wrap"><table id="{table_id}"><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


def render(profile, output_dir):
    p, t, v = profile, profile["tables"], profile["validation"]
    overall = p["overall"]
    outcomes = sorted(p["macro_micro"], key=lambda row: -row["n"])
    pair = sorted(t["by_contract_statement"], key=lambda row: -row["loss_rate"])
    states = sorted(t["by_uf"], key=lambda row: -row["loss_rate"])
    models = v["classification"]
    absent_pair = pair[0]
    present_pair = pair[-1]
    missing_either = [row for row in pair if not (row["contrato"] and row["extrato"])]
    missing_n = sum(row["n"] for row in missing_either)
    missing_losses = sum(row["losses"] for row in missing_either)
    missing_cost = sum(row["total_result"] for row in missing_either)
    sections = []

    def section(title, paragraphs, headers=None, rows=None, after=None, table_id=""):
        sections.append({"title": title, "paragraphs": paragraphs, "headers": headers, "rows": rows, "after": after or [], "table_id": table_id})

    section("O principal achado", [
        f"A presença conjunta de contrato e extrato é o sinal mais forte encontrado: a taxa de condenação passa de {percent(absent_pair['loss_rate'])} nos casos sem ambos para {percent(present_pair['loss_rate'])} nos casos com ambos. São associações históricas entre perfis de casos; a análise não demonstra que anexar um documento cause essa redução.",
        f"Os {number(missing_n)} casos com ausência de pelo menos um desses dois documentos representam {percent(missing_n / overall['n'])} da base e concentram {percent(missing_losses / overall['losses'])} das condenações e {percent(missing_cost / overall['total_result'])} do valor registrado em condenações e acordos. Esse recorte é um candidato para priorizar revisão documental e análise de negociação.",
    ], ["Contrato", "Extrato", "Casos sem acordo", "Condenação", "IC de 95%", "Valor médio por caso*"], [
        [yes(r["contrato"]), yes(r["extrato"]), number(r["n_court"]), percent(r["loss_rate"]), f"{percent(r['loss_rate_ci_low'])}–{percent(r['loss_rate_ci_high'])}", money(r["cost_mean_court"])] for r in pair
    ], ["*Inclui o valor zero de improcedências e extinções. Não inclui honorários, custas, juros ou tempo. Os 280 acordos estão excluídos desse denominador. Intervalos de Wilson descrevem incerteza amostral, sob independência dos casos; não corrigem viés de seleção ou desenho da base."])

    section("Resultados e valores", [
        f"Foram relacionados {number(overall['n'])} processos únicos entre as duas abas, sem duplicatas, campos vazios ou processos sem correspondência. O assunto é constante; há dois subassuntos e 26 UFs.",
        f"A soma dos valores de condenação/indenização é {money(overall['total_result'], 2)}. A média por processo é {money(overall['cost_mean_all'], 2)}; entre os {number(overall['losses'])} processos com condenação, a média é {money(overall['cost_mean_loss'], 2)} e a mediana é {money(overall['cost_median_loss'], 2)}. São valores registrados na base, sem comprovação de pagamento efetivo ou custo total do processo.",
    ], ["Resultado", "Casos", "% da base", "Valor médio registrado"], [
        [r["resultado_micro"], number(r["n"]), percent(r["n"] / overall["n"], 2), money(r["mean"], 2)] for r in outcomes
    ], [
        f"Definição principal: condenação = procedência ou parcial procedência. A taxa é {number(overall['losses'])} / {number(overall['n_court'])} = {percent(overall['loss_rate'], 2)} entre os encerrados sem acordo, incluindo extinções como não condenação. Considerando apenas julgamentos de mérito (excluindo também extinções), é {percent(p['merits']['loss_rate'], 2)} em {number(p['merits']['n'])} processos. Esses denominadores não devem ser misturados.",
        "O rótulo macro ‘Não Êxito’ agrupa condenações e acordos. Ele não foi usado como alvo de risco judicial nem como variável de entrada.",
    ])

    section("Quais documentos diferenciam os resultados", [
        "Os indicadores informam se o subsídio foi disponibilizado. Não informam autenticidade, validade, qualidade, conteúdo ou data de disponibilização.",
    ], ["Documento", "Disponível na base", "Condenação sem", "Condenação com", "Diferença com − sem"], [
        [r["label"], percent(r["availability"]), percent(r["absent_loss_rate"]), percent(r["present_loss_rate"]), number(r["difference_present_minus_absent"] * 100, 1) + " p.p."] for r in t["by_document"]
    ], [
        "Contrato, extrato e comprovante de crédito mantêm associação forte no modelo que também considera UF, subassunto, valor da causa e os outros documentos. Para dossiê e laudo, o indicador binário de presença acrescenta pouco nesta base; isso não demonstra que seu conteúdo seja dispensável.",
        "Contar documentos com o mesmo peso perde informação: contrato e extrato são muito mais discriminantes que dossiê e laudo nos dados disponíveis.",
    ])

    section("Contrato, extrato e comprovante de crédito", [
        "As oito combinações abaixo detalham a diferença entre ausência e presença dos três indicadores mais informativos. São perfis descritivos, sem validação de uma regra de acordo específica.",
    ], ["Contrato", "Extrato", "Comprovante", "Casos sem acordo", "Condenação", "Valor médio por caso"], [
        [yes(r["contrato"]), yes(r["extrato"]), yes(r["comprovante_credito"]), number(r["n_court"]), percent(r["loss_rate"]), money(r["cost_mean_court"])] for r in sorted(t["by_core_documents"], key=lambda row: -row["loss_rate"])
    ])

    section("Subassunto e valor da causa", [
        "O subassunto ‘Golpe’ apresenta risco maior que ‘Genérico’. Antes de utilizá-lo em uma recomendação, é necessário confirmar que essa classificação existe no momento da decisão, e não resulta de análise posterior.",
    ], ["Subassunto", "Casos sem acordo", "Condenação", "Valor médio por caso", "Média quando há condenação"], [
        [r["subassunto"], number(r["n_court"]), percent(r["loss_rate"]), money(r["cost_mean_court"]), money(r["cost_mean_loss"])] for r in t["by_subsubject"]
    ], [
        f"O valor médio da causa é {money(overall['claim_mean'], 2)}. No modelo conjunto, o logaritmo do valor da causa tem associação pequena com a probabilidade de condenação. O valor da causa continua sendo relevante para a magnitude financeira: nos casos condenados, a relação média valor da condenação / valor da causa é {percent(overall['payout_ratio_mean_loss'])}.",
    ])

    section("Diferenças por UF", [
        "AP e AM têm as maiores taxas observadas; MA, PI e MT estão entre as menores. São diferenças da amostra, sem controle causal. O modelo conjunto considera UF ao lado dos documentos e do subassunto.",
        "A distribuição geográfica tem 2.307 ou 2.308 casos por UF, com Roraima ausente. Esse equilíbrio quase exato é compatível com amostragem balanceada ou geração sintética; a origem precisa ser confirmada. A média da planilha não representa automaticamente a carteira real do banco.",
    ], ["UF", "Casos sem acordo", "Condenação", "IC de 95%", "Valor médio por caso"], [
        [r["uf"], number(r["n_court"]), percent(r["loss_rate"]), f"{percent(r['loss_rate_ci_low'])}–{percent(r['loss_rate_ci_high'])}", money(r["cost_mean_court"])] for r in states
    ], table_id="uf-table")

    auc_ci = v["full_auc_bootstrap_ci95"]
    section("Validação exploratória de previsão", [
        f"Foram separados {number(v['train_n'])} processos para ajuste e {number(v['test_n'])} para avaliação, com divisão aleatória estratificada por resultado, aproximadamente 80/20, semente {v['seed']}. Os acordos foram excluídos. Os casos de avaliação não foram usados para estimar os coeficientes.",
        "Foram comparadas regressões logísticas com penalização L2 fixa. Entradas: indicadores de documentos, UF, subassunto e logaritmo padronizado do valor da causa. Identificador, resultados e valor da condenação não entram nas variáveis de risco. Padronização e níveis categóricos foram obtidos no conjunto de ajuste.",
    ], ["Modelo", "AUC", "Brier", "Taxa prevista", "Taxa observada"], [
        [MODEL_NAMES[r["model"]], number(r["auc"], 3), number(r["brier"], 3), percent(r["predicted_rate"]), percent(r["observed_rate"])] for r in models
    ], [
        f"AUC mede ordenação do risco: 0,5 equivale à referência sem discriminação e 1 à ordenação perfeita. AUC 0,923 não significa 92,3% de acurácia. O intervalo de 95% por bootstrap de {v['bootstrap_replicates']} reamostragens do conjunto de avaliação é {number(auc_ci[0], 3)}–{number(auc_ci[1], 3)}, condicionado ao modelo já ajustado. Brier mede erro das probabilidades; menor é melhor.",
        f"No conjunto de avaliação, os 20% classificados com maior risco ({number(v['top_20pct_priority']['n'])} casos) contêm {percent(v['top_20pct_priority']['loss_capture'])} das condenações e {percent(v['top_20pct_priority']['observed_cost_share'])} do valor registrado. A frequência de condenação nesse grupo é {percent(v['top_20pct_priority']['loss_rate'])}. Isso indica potencial de priorização; não mede economia de acordos.",
        "Esta é uma validação exploratória em uma única base, sem datas e sem teste temporal ou externo. Ela não resolve seleção histórica dos casos, disponibilidade tardia de documentos ou generalização para casos novos.",
    ])

    section("Calibração por faixa de risco", [
        "Os casos de avaliação foram ordenados pela probabilidade estimada e divididos em dez grupos de tamanho semelhante. A comparação permite verificar se taxas previstas e observadas são coerentes.",
    ], ["Decil", "Casos", "Condenação prevista", "Condenação observada", "Valor previsto por caso", "Valor observado por caso"], [
        [r["risk_decile"], number(r["n"]), percent(r["predicted_loss"]), percent(r["observed_loss"]), money(r["predicted_cost"]), money(r["observed_cost"])] for r in v["calibration"]
    ])

    section("Referência financeira para a política", [
        "Foi estimado um modelo em duas partes: probabilidade de condenação × valor estimado caso haja condenação. A segunda parte estima a razão condenação / valor da causa, usando apenas casos condenados do conjunto de ajuste, e a limita ao intervalo observado de zero a um.",
    ], ["Estimativa", "Erro absoluto médio", "Raiz do erro quadrático médio", "Valor médio previsto"], [
        [COST_NAMES[r["model"]], money(r["mae"]), money(r["rmse"]), money(r["predicted_mean"])] for r in v["cost_prediction"]
    ], [
        "O modelo em duas partes melhora a previsão individual frente às referências, mas o erro absoluto médio de aproximadamente R$ 2.212 ainda é material. Seu resultado é uma referência probabilística, não um valor garantido de condenação nem uma oferta ótima.",
        "Para uma regra inicial, comparar o valor proposto e custos do acordo com a referência de continuar o processo, acrescentando custos de defesa, duração e outros parâmetros quando disponíveis. A expectativa de custo sob a opção acordo depende também da chance de aceitação, das tentativas e do custo caso a proposta seja recusada.",
        f"Há apenas {number(p['agreements']['n'])} acordos registrados ({percent(p['agreements']['n'] / overall['n'], 2)} da base), com média {money(p['agreements']['mean'], 2)} e mediana {money(p['agreements']['median'], 2)}. Não há propostas recusadas, número de tentativas, contrapropostas ou política histórica. Portanto, não é possível estimar taxa de aceitação nem concluir que oferecer essa média a outros casos produziria economia.",
        "A diferença entre o valor médio de acordos e o de condenações compara grupos selecionados de formas distintas. Não é uma medida causal de economia. Projeções mensais exigem o perfil da carteira entrante e hipóteses explícitas, além de validação prospectiva.",
    ])

    section("Implicações para a primeira versão do produto", [
        "1. Priorizar a conferência de contrato e extrato. Exibir os documentos disponíveis e o que falta, com possibilidade de atualizar a análise quando novos subsídios chegarem.",
        "2. Mostrar risco estimado, referência financeira e evidências que sustentam a análise. Usar o conteúdo dos documentos para verificar consistência e autenticidade; a planilha só informa presença.",
        "3. Separar recomendação, decisão do advogado e resultado. Registrar motivo de divergência, valor proposto, aceite, recusa, contraproposta e valor final.",
        "4. Avaliar aderência e efetividade em um piloto com acompanhamento temporal. Estimar economia por comparação adequada e explicitar custos e incerteza.",
    ])

    q = p["quality"]
    section("Qualidade, limites e reprodução", [
        f"As duas abas têm 60.000 identificadores únicos e correspondência integral. Os indicadores de documentos são binários. Não há valores negativos, infinitos ou condenações superiores ao valor da causa. Há {number(q['results_more_than_two_decimals'])} valores de resultado com mais de duas casas decimais; os cálculos preservam essa precisão e a apresentação arredonda para reais/centavos.",
        "As abas não têm datas de disponibilização de documentos, entrada, sentença ou acordo; escritório/advogado; taxas, honorários, custas e juros; histórico de ofertas; ou avaliação de qualidade dos documentos. Nenhum campo ausente foi preenchido por suposição.",
        "A associação entre documentos e resultados pode refletir características não observadas dos casos e decisões históricas. O modelo condicionado às variáveis disponíveis não elimina esse problema. A estabilidade e o momento de medição dos dados precisam ser avaliados antes de uso operacional.",
        "Sensibilidade: as tabelas merits_by_contract_statement e merits_by_document_count excluem também extinções. Todas as tabelas agregadas são exportadas em CSV; o arquivo profile.json contém os resultados e os coeficientes exploratórios. Não são exportados registros ou identificadores individuais.",
        f"Fonte: {p['source']}, abas ‘Resultados dos processos’ (A1:H60001) e ‘Subsídios disponibilizados’ (A2:G60002). SHA-256: {p['sha256']}.",
        "O script confere as chaves e os indicadores, verifica métricas com exemplos de ordenação conhecida, verifica a regressão de intercepto contra uma frequência conhecida, e testa convergência do modelo conjunto. O workbook é somente lido.",
    ])

    markdown = ["# Análise dos 60 mil processos\n", "Suits AI · Base do Hackathon Enter\n"]
    for s in sections:
        markdown.extend(["## " + s["title"], *s["paragraphs"]])
        if s["headers"]:
            markdown.append(markdown_table(s["headers"], s["rows"]))
        markdown.extend(s["after"])
    markdown.extend(["## Executar novamente", 'Na raiz do repositório, após instalar as dependências de `scripts/requirements-analysis.txt`:', '```powershell\npython scripts/analyze_cases.py "artefacts/Hackaton Unicamp/Hackaton_Enter_Base_Candidatos.xlsx" --output-dir artefacts/suits_docs/analysis\n```'])
    (output_dir / "README.md").write_text("\n\n".join(markdown) + "\n", encoding="utf-8")

    section_html = []
    for index, s in enumerate(sections):
        paragraphs = "".join(f"<p>{html.escape(paragraph)}</p>" for paragraph in s["paragraphs"])
        after = "".join(f'<p class="note">{html.escape(paragraph)}</p>' for paragraph in s["after"])
        search = '<label class="search-label" for="uf-filter">Filtrar por UF</label><input id="uf-filter" maxlength="2" placeholder="Ex.: SP" autocomplete="off"><p id="uf-count" class="note">26 UFs</p>' if s["table_id"] else ""
        table = html_table(s["headers"], s["rows"], s["table_id"]) if s["headers"] else ""
        section_html.append(f'<section id="s{index}"><div class="section-num">{index + 1:02}</div><h2>{html.escape(s["title"])}</h2>{paragraphs}{search}{table}{after}</section>')
    navigation = "".join(f'<a href="#s{index}">{html.escape(s["title"])}</a>' for index, s in enumerate(sections))
    bars = []
    for row in pair:
        label = ("Com" if row["contrato"] else "Sem") + " contrato / " + ("com" if row["extrato"] else "sem") + " extrato"
        bars.append(f'<div class="bar-row"><span>{label}</span><div class="track"><i style="width:{row["loss_rate"] * 100:.2f}%"></i></div><strong>{percent(row["loss_rate"])}</strong></div>')
    document = """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Suits AI — Análise dos 60 mil processos</title><style>
:root{--navy:#172b44;--ink:#18283b;--blue:#3469a5;--muted:#546476;--line:#dce3e9;--paper:#fff;--bg:#f3f5f7}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 'Segoe UI',Arial,sans-serif}header{background:var(--navy);color:white;padding:56px max(28px,calc((100vw - 1160px)/2)) 46px}.brand{font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#b9cee5}h1{font-size:clamp(32px,4vw,52px);font-weight:650;line-height:1.12;max-width:940px;margin:18px 0}header p{max-width:840px;color:#d2deeb;margin-bottom:0}.page{max-width:1220px;margin:auto;padding:30px}.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:30px}.kpi{background:white;border:1px solid var(--line);padding:20px 22px}.kpi strong{display:block;font-size:30px;color:var(--navy);line-height:1.3}.kpi span{display:block;font-size:13px;color:var(--muted);margin-top:6px}.insight{background:white;border-left:4px solid var(--blue);padding:28px 30px;margin-bottom:24px}.insight h2{margin-top:0;font-size:23px}.bar-row{display:grid;grid-template-columns:240px 1fr 66px;gap:16px;align-items:center;margin:12px 0;font-size:14px}.bar-row strong{text-align:right;font-variant-numeric:tabular-nums}.track{height:15px;background:#edf1f5;overflow:hidden}.track i{display:block;height:100%;background:var(--blue)}.note{font-size:13px;color:var(--muted);overflow-wrap:anywhere}.layout{display:grid;grid-template-columns:218px minmax(0,1fr);gap:26px}nav{position:sticky;top:20px;align-self:start;padding:14px 0}nav a{display:block;text-decoration:none;color:var(--muted);font-size:13px;line-height:1.45;padding:8px 12px;border-left:2px solid transparent}nav a:hover,nav a:focus{color:var(--blue);border-color:var(--blue);background:#e9eff6}section{background:white;border:1px solid var(--line);padding:28px 32px;margin:0 0 22px;scroll-margin-top:20px}.section-num{font-size:12px;font-weight:700;letter-spacing:.08em;color:var(--blue)}h2{font-size:25px;line-height:1.3;margin:6px 0 20px}p{margin:0 0 16px}.table-wrap{overflow:auto;margin:20px 0}table{border-collapse:collapse;width:100%;font-size:13px;line-height:1.5}th{background:#edf2f7;color:#243d59;text-align:left;font-weight:600;padding:12px 10px;vertical-align:bottom}td{padding:11px 10px;border-bottom:1px solid var(--line);font-variant-numeric:tabular-nums;vertical-align:top}td:not(:first-child){text-align:right}tr:last-child td{border-bottom:0}tbody tr:hover{background:#f8fafc}input{border:1px solid #b4c2d0;padding:9px 12px;border-radius:2px;font:inherit;width:120px;margin:6px 0 8px;text-transform:uppercase}.search-label{display:block;font-size:13px;font-weight:600}footer{padding:16px 0 40px;color:var(--muted);font-size:13px}a{color:var(--blue)}button{font:inherit;border:1px solid #b8c7d5;background:white;color:var(--navy);padding:7px 14px;cursor:pointer}button:focus-visible,input:focus-visible{outline:3px solid #a3c4ed;outline-offset:2px}@media(max-width:950px){.layout{display:block}nav{position:static;display:flex;gap:6px;overflow:auto;padding:0 0 20px}nav a{min-width:150px;background:white;border:1px solid var(--line)}.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.page{padding:18px}.kpi{padding:16px}.kpi strong{font-size:25px}section,.insight{padding:22px 18px}.bar-row{grid-template-columns:1fr 64px;gap:6px}.bar-row span{grid-column:1/-1}.bar-row strong{grid-column:2}header{padding:36px 22px}.kpis{gap:10px}h2{font-size:22px}}@media print{body{background:white}header{padding:20px;color:var(--ink);background:white}header p,.brand{color:var(--muted)}.page{max-width:none;padding:0}nav,.search-label,input,#uf-count,button{display:none}.layout{display:block}section{break-inside:auto;padding:20px 0;border:0;border-top:1px solid var(--line)}tr{break-inside:avoid}.kpis{grid-template-columns:repeat(4,1fr)}.table-wrap{overflow:visible}a{color:inherit}}
</style></head><body><header><div class="brand">Suits AI / Hackathon Enter</div><h1>O risco se concentra na ausência de contrato e extrato</h1><p>Análise de 60 mil processos de não reconhecimento de operação. Evidências descritivas, validação exploratória e implicações para a política de acordos.</p></header><main class="page">"""
    kpis = [(number(overall["n"]), "processos relacionados"), (percent(overall["loss_rate"]), "condenação entre casos sem acordo"), (money(overall["cost_mean_loss"]), "média nos casos com condenação"), (number(models[-1]["auc"], 3), "AUC na avaliação separada")]
    document += '<div class="kpis">' + "".join(f'<div class="kpi"><strong>{value}</strong><span>{label}</span></div>' for value, label in kpis) + '</div>'
    document += '<div class="insight"><h2>Contrato e extrato em conjunto</h2>' + "".join(bars) + '<p class="note">Taxa de condenação entre processos encerrados sem acordo. Associação observada; presença do documento não comprova sua qualidade ou efeito causal.</p></div>'
    document += '<div class="layout"><nav aria-label="Seções do relatório">' + navigation + '</nav><article>' + "".join(section_html) + '</article></div>'
    document += '<footer>Fonte: ' + html.escape(p["source"]) + '. <a href="README.md">Relatório em Markdown</a> · <a href="profile.json">Resultados agregados</a><br>Os valores apresentados são históricos; não representam economia realizada.</footer></main>'
    document += """<script>const filter=document.querySelector('#uf-filter');const rows=[...document.querySelectorAll('#uf-table tbody tr')];filter.addEventListener('input',()=>{const value=filter.value.trim().toUpperCase();let n=0;rows.forEach(row=>{const visible=row.cells[0].textContent.includes(value);row.hidden=!visible;if(visible)n++});document.querySelector('#uf-count').textContent=n+' UFs exibidas'});</script></body></html>"""
    (output_dir / "report.html").write_text(document, encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("profile", type=Path)
    args = parser.parse_args()
    render(json.loads(args.profile.read_text(encoding="utf-8")), args.profile.parent)
    print("Reports written to " + str(args.profile.parent))
