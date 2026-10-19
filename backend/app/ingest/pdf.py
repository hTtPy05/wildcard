from typing import Dict, Any, List
import pdfplumber


def parse_pdf(file_path: str) -> Dict[str, Any]:
    """
    Parses a PDF file page by page, tracking character offsets and page numbers.
    """
    full_text_chunks: List[str] = []
    pages_meta: List[Dict[str, Any]] = []
    current_offset = 0

    with pdfplumber.open(file_path) as pdf:
        for idx, page in enumerate(pdf.pages, start=1):
            text = page.extract_text() or ""
            # Clean and normalize
            text = text.replace("\r\n", "\n").replace("\r", "\n")
            start = current_offset
            end = start + len(text)
            
            pages_meta.append({
                "page": idx,
                "start": start,
                "end": end,
                "char_count": len(text)
            })
            
            full_text_chunks.append(text)
            current_offset = end + 1  # newline between pages

    normalized_text = "\n".join(full_text_chunks)
    return {
        "text": normalized_text,
        "char_count": len(normalized_text),
        "page_count": len(pages_meta),
        "pages": pages_meta
    }
