from io import BytesIO

from docx import Document as DocxDocument
from pypdf import PdfReader


def extract_text(content: bytes, content_type: str) -> str:
    if content_type == "text/plain":
        return content.decode("utf-8")

    if content_type == "application/pdf":
        reader = PdfReader(BytesIO(content))
        return "\n".join(page.extract_text() or "" for page in reader.pages)

    if content_type == ("application/vnd.openxmlformats-officedocument.wordprocessingml.document"):
        document = DocxDocument(BytesIO(content))
        return "\n".join(paragraph.text for paragraph in document.paragraphs)

    raise ValueError("Unsupported document type")
