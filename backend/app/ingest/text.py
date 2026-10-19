from typing import Dict, Any, List, Tuple


def normalize_text(text: str) -> str:
    """Normalizes CRLF to LF and strips trailing spaces per line."""
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")]
    return "\n".join(lines)


def parse_text_with_offsets(raw_text: str) -> Dict[str, Any]:
    """
    Parses plain text / markdown into normalized text and generates line-to-offset mapping.
    This enables fast exact-substring search and visual span highlighting.
    """
    clean = normalize_text(raw_text)
    
    # Build line index: (line_number, start_offset, end_offset, text)
    lines: List[Dict[str, Any]] = []
    current_offset = 0
    
    for idx, line in enumerate(clean.split("\n"), start=1):
        end_offset = current_offset + len(line)
        lines.append({
            "line_number": idx,
            "start": current_offset,
            "end": end_offset,
            "text": line
        })
        current_offset = end_offset + 1  # accounts for \n
        
    return {
        "text": clean,
        "char_count": len(clean),
        "line_count": len(lines),
        "lines": lines
    }


def find_span_offsets(full_text: str, excerpt: str) -> Tuple[int, int]:
    """
    Finds start and end offsets of an excerpt in full_text.
    Tries exact match first, then normalized-whitespace match.
    """
    if not excerpt:
        return (-1, -1)
    
    idx = full_text.find(excerpt)
    if idx != -1:
        return (idx, idx + len(excerpt))
        
    # Whitespace-insensitive fallback
    norm_excerpt = " ".join(excerpt.split())
    if not norm_excerpt:
        return (-1, -1)
        
    # Search for first 30 chars of excerpt
    prefix = norm_excerpt[:min(30, len(norm_excerpt))]
    idx = full_text.find(prefix)
    if idx != -1:
        return (idx, min(len(full_text), idx + len(norm_excerpt)))
        
    return (-1, -1)
