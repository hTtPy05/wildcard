from typing import Dict, Any, List
from ..llm.client import LLMClient
from ..ingest.text import find_span_offsets


def extract_project_model_from_artifacts(
    artifacts: List[Dict[str, Any]],
    project_name: str = "",
    llm_client: LLMClient = None
) -> Dict[str, Any]:
    """
    Extracts goals, stakeholders, features, stated assumptions, constraints, etc.
    Annotates each source quote with accurate character offsets inside the source text.
    """
    if llm_client is None:
        llm_client = LLMClient()

    # Collect combined document text
    combined_text = ""
    primary_doc_id = None
    for a in artifacts:
        if a.get("kind") == "document":
            combined_text += f"\n--- {a.get('name')} ---\n" + (a.get("raw_text") or "")
            if primary_doc_id is None:
                primary_doc_id = a.get("id")

    if not combined_text.strip():
        # Build baseline from dataset or workflow
        for a in artifacts:
            combined_text += f"\n--- {a.get('name')} ({a.get('kind')}) ---\n"
            if a.get("raw_text"):
                combined_text += a["raw_text"][:2000]

    model_data = llm_client.extract_project_model(combined_text, project_name=project_name)

    # Validate and annotate character offsets for all quotes
    for key, items in model_data.items():
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict) and "source" in item:
                    source = item["source"]
                    quote = source.get("quote", "")
                    if quote and combined_text:
                        s, e = find_span_offsets(combined_text, quote)
                        if s != -1:
                            source["start_offset"] = s
                            source["end_offset"] = e
                    if primary_doc_id and not source.get("artifact_id"):
                        source["artifact_id"] = primary_doc_id

    return model_data
