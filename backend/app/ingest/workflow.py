import json
from typing import Dict, Any, List, Optional
import yaml
import networkx as nx


def parse_workflow_data(raw_content: str) -> Dict[str, Any]:
    """
    Parses workflow definitions from JSON or YAML string into a structured graph dictionary.
    """
    try:
        data = json.loads(raw_content)
    except Exception:
        try:
            data = yaml.safe_load(raw_content)
        except Exception as e:
            raise ValueError(f"Failed to parse workflow data as JSON or YAML: {str(e)}")

    if not isinstance(data, dict):
        raise ValueError("Workflow definition must be a dictionary")

    nodes = data.get("nodes", [])
    edges = data.get("edges", [])
    workflow_id = data.get("workflow_id", "wf_default")
    name = data.get("name", "Workflow")
    description = data.get("description", "")

    # Standardize nodes
    clean_nodes: List[Dict[str, Any]] = []
    node_ids = set()
    for n in nodes:
        nid = str(n.get("id", ""))
        if not nid:
            continue
        node_ids.add(nid)
        clean_nodes.append({
            "id": nid,
            "label": n.get("label", nid),
            "owner": n.get("owner"),
            "action_type": n.get("action_type", "manual"),
            "reversible": bool(n.get("reversible", True)),
            "description": n.get("description", "")
        })

    # Standardize edges
    clean_edges: List[Dict[str, Any]] = []
    for e in edges:
        src = str(e.get("from") or e.get("source") or "")
        tgt = str(e.get("to") or e.get("target") or "")
        if src and tgt:
            clean_edges.append({
                "from": src,
                "to": tgt,
                "condition": e.get("condition", "always")
            })

    return {
        "workflow_id": workflow_id,
        "name": name,
        "description": description,
        "node_count": len(clean_nodes),
        "edge_count": len(clean_edges),
        "nodes": clean_nodes,
        "edges": clean_edges
    }


def build_workflow_graph(workflow_dict: Dict[str, Any]) -> nx.DiGraph:
    """
    Converts a workflow dictionary into a NetworkX DiGraph with node and edge attributes.
    """
    G = nx.DiGraph()
    for node in workflow_dict.get("nodes", []):
        G.add_node(
            node["id"],
            label=node.get("label", node["id"]),
            owner=node.get("owner"),
            action_type=node.get("action_type", "manual"),
            reversible=node.get("reversible", True),
            description=node.get("description", "")
        )

    for edge in workflow_dict.get("edges", []):
        G.add_edge(edge["from"], edge["to"], condition=edge.get("condition", ""))

    return G
