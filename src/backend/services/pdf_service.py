from html import escape
from io import BytesIO
from pathlib import Path
import re

from markdown_it import MarkdownIt
import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from src.backend.schemas import DraftResponse


class PdfService:
    def html(self, draft: DraftResponse, content: str) -> str:
        parser = MarkdownIt("commonmark", {"html": False}).disable("image")
        body = parser.render(content)
        return """<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
        <title>""" + escape(draft.title) + """</title><style>
        @page { size: A4; margin: 24mm 23mm;
          @bottom-center { content: 'MINUTA PARA REVISÃO | Página ' counter(page); font-size: 8pt; color: #64748b; } }
        body { font: 11pt/1.55 Georgia, serif; color: #182a3b; overflow-wrap: anywhere; }
        header { font: 10pt Arial, sans-serif; padding-bottom: 12pt; border-bottom: 2pt solid #236b70; }
        h1 { font: bold 20pt/1.2 Arial, sans-serif; color: #153c52; }
        h2 { font: bold 13pt Arial, sans-serif; margin-top: 22pt; break-after: avoid; }
        p { orphans: 3; widows: 3; } li { margin-bottom: 6pt; }
        .label { font: bold 9pt Arial,sans-serif; color:#7c4824; margin: 12pt 0; }
        @media screen { body { max-width: 780px; margin: 40px auto; padding: 24px; } }
        </style></head><body><header>SUITS AI | Revisão jurídica</header>
        <div class="label">MINUTA PARA REVISÃO - SEM ASSINATURA OU ACEITE</div>""" + body + "</body></html>"

    def render(self, draft: DraftResponse, content: str) -> tuple[bytes, str]:
        return self.reportlab(content), "reportlab"

    def reportlab(self, content: str) -> bytes:
        fonts = Path(reportlab.__file__).parent / "fonts"
        for name, filename in [("Suits", "Vera.ttf"), ("SuitsBold", "VeraBd.ttf")]:
            if name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(name, str(fonts / filename)))
        normal = ParagraphStyle("SuitsBody", fontName="Suits", fontSize=10, leading=15,
                                spaceAfter=9, textColor=colors.HexColor("#182a3b"), alignment=TA_JUSTIFY)
        heading = ParagraphStyle("SuitsHeading", parent=normal, fontName="SuitsBold",
                                 fontSize=12, leading=17, spaceBefore=14, keepWithNext=True)
        title = ParagraphStyle("SuitsTitle", parent=heading, fontSize=19, leading=24)
        story = []
        for block in re.split(r"\n\s*\n", content):
            block = block.strip()
            if not block:
                continue
            style = title if block.startswith("# ") else heading if block.startswith("## ") else normal
            block = re.sub(r"^#{1,6}\s+", "", block)
            # Escape antes de aplicar a pequena marcação suportada pelo ReportLab.
            safe = escape(block).replace("\n", "<br/>")
            safe = re.sub(r"\*\*(.+?)\*\*", r'<font name="SuitsBold">\1</font>', safe)
            story.append(Paragraph(safe, style))
        if not story:
            story.append(Paragraph("Minuta sem conteúdo.", normal))
        story.append(Spacer(1, 3*mm))
        output = BytesIO()

        def frame(canvas, doc):
            canvas.saveState()
            canvas.setFillColor(colors.HexColor("#153c52"))
            canvas.setFont("SuitsBold", 9)
            canvas.drawString(23*mm, A4[1]-15*mm, "SUITS AI | Revisão jurídica")
            canvas.setStrokeColor(colors.HexColor("#236b70"))
            canvas.line(23*mm, A4[1]-18*mm, A4[0]-23*mm, A4[1]-18*mm)
            canvas.setFont("Suits", 7)
            canvas.drawCentredString(A4[0]/2, 13*mm, f"MINUTA PARA REVISÃO - SEM ASSINATURA OU ACEITE | Página {doc.page}")
            canvas.restoreState()

        document = SimpleDocTemplate(output, pagesize=A4, leftMargin=23*mm, rightMargin=23*mm,
            topMargin=26*mm, bottomMargin=23*mm, title="Minuta para revisão - Suits AI")
        document.build(story, onFirstPage=frame, onLaterPages=frame)
        return output.getvalue()
