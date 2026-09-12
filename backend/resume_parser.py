import fitz  # PyMuPDF 
import docx
import io


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    file_ext = filename.lower().split('.')[-1]

    if file_ext == "pdf":
        return _extract_from_pdf(file_content)
    elif file_ext in ["doc", "docx"]:
        return _extract_from_docx(file_content)
    elif file_ext == "txt":
        return " ".join(file_content.decode("utf-8", errors="ignore").split())
    else:
        raise ValueError(f"Unsupported file type: .{file_ext}. Upload PDF, DOCX, or TXT.")


def extract_text_from_plain(text: str) -> str:
    # for when recruiter pastes JD directly as text
    return " ".join(text.split())


def _extract_from_pdf(file_content: bytes) -> str:
    text = ""
    with fitz.open(stream=file_content, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text() + "\n"
    return " ".join(text.split())


def _extract_from_docx(file_content: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_content))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return " ".join(paragraphs)
