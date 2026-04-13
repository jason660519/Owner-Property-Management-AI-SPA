
import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from io import BytesIO

class PDFGenerator:
    def __init__(self, template_dir: str):
        self.template_dir = template_dir
        self.env = Environment(loader=FileSystemLoader(template_dir))

    def generate_contract_pdf(self, contract_data: dict) -> BytesIO:
        """
        Generates a PDF for a contract from an HTML template.
        """
        template = self.env.get_template("contract_template.html")
        html_content = template.render(contract=contract_data)

        pdf_buffer = BytesIO()
        HTML(string=html_content).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)
        return pdf_buffer
