from typing import Dict, Any, List
import docx


def parse_docx(file_path: str) -> Dict[str, Any]:
    """
    Parses a DOCX file paragraph by paragraph, tracking character offsets.
    """
    doc = docx.Document(file_path)
    paragraphs_meta: List[Dict[str, Any]] = []
    text_chunks: List[str] = []
    current_offset = 0

    for idx, p in enumerate(doc.paragraphs, start=1):
        p_text = p.text.strip()
        if not p_text:
            continue
            
        start = current_offset
        end = start + len(p_text)
        
        paragraphs_meta.append({
            "paragraph": idx,
            "start": start,
            "end": end,
            "style": p.style.name if p.style else "Normal"
        })
        text_chunks.append(p_text)
        current_offset = end + 1

    normalized_text = "\n".join(text_chunks)
    return {
        "text": normalized_text,
        "char_count": len(normalized_text),
        "paragraph_count": len(paragraphs_meta),
        "paragraphs": paragraphs_meta
    }
