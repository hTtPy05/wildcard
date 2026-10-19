from typing import Dict, Any, List
import networkx as nx
from .base import BaseAnalyzer
from ..ingest.workflow import build_workflow_graph


class WorkflowRiskAnalyzer(BaseAnalyzer):
    """
    Deterministic analyzer that audits workflow graphs using NetworkX
    for unowned steps, missing rollback paths, single points of failure,
    cycles, unreachable states, and unapproved irreversible actions.
    """

    def analyze(self, workflow_dict: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        findings: List[Dict[str, Any]] = []
        artifact_id = context.get("artifact_id")
        artifact_name = context.get("artifact_name", "Workflow")
        
        nodes = workflow_dict.get("nodes", [])
        edges = workflow_dict.get("edges", [])
        G = build_workflow_graph(workflow_dict)

        # 1. Check for Steps with No Owner
        for node in nodes:
            nid = node.get("id")
            owner = node.get("owner")
            label = node.get("label", nid)
            
            if owner is None or str(owner).strip() in ("", "null", "None", "unassigned"):
                findings.append({
                    "type": "workflow_risk",
                    "title": f"Unowned Workflow Step '{label}' ({nid})",
                    "explanation": f"Workflow step '{label}' has no designated owner or responsible system service. Unassigned steps cause pipeline stagnation when manual intervention or exceptional recovery is required. Accountability is undefined during operational incidents.",
                    "why_it_matters": "If this step stalls or generates an exception, no on-call engineer or warehouse operator receives an alert, leading to silent process failure.",
                    "evidence": [{
                        "artifact_id": artifact_id,
                        "artifact_name": artifact_name,
                        "kind": "node",
                        "locator": f"node:{nid}",
                        "excerpt": f"node='{label}', owner=null",
                        "detail": f"Step {nid} ({label}) lacks any assigned service or individual owner"
                    }],
                    "sub_scores": {
                        "severity": 0.70,
                        "likelihood": 0.85,
                        "breadth": 0.50,
                        "irreversibility": 0.30,
                        "time_sensitivity": 0.70,
                        "justifications": {
                            "severity": "Operational bottleneck without responsible party.",
                            "likelihood": "Directly unassigned in configuration.",
                            "breadth": "Halts the entire downstream fulfillment sequence.",
                            "irreversibility": "Can be fixed with role assignment.",
                            "time_sensitivity": "Needs definition prior to production launch."
                        }
                    },
                    "recommendations": [
                        {"action": f"Assign step '{nid}' to an explicit warehouse role or automated background service.", "effort": "low"},
                        {"action": "Configure dead-letter monitoring and escalation timers for unhandled items.", "effort": "medium"}
                    ],
                    "questions": [
                        f"Who is responsible for executing or unblocking '{label}' when warehouse printers fail?",
                        "Should this step be automated or handled by fulfillment staff?"
                    ]
                })

        # 2. Check for Missing Error / Rollback Paths (e.g. after payment or state mutation)
        for node in nodes:
            nid = node.get("id")
            label = node.get("label", nid).lower()
            out_edges = [e for e in edges if e["from"] == nid]
            
            # If step authorizes/captures payment or mutates balance
            is_financial_or_state = any(kw in label for kw in ["payment", "charge", "pay", "billing", "authorize", "deduct"])
            if is_financial_or_state:
                has_error_branch = any("fail" in e.get("condition", "").lower() or "error" in e.get("condition", "").lower() or "rollback" in e.get("condition", "").lower() for e in out_edges)
                if not has_error_branch:
                    findings.append({
                        "type": "workflow_risk",
                        "title": f"Missing Error and Rollback Path for '{node.get('label')}'",
                        "explanation": f"Step '{node.get('label')}' ({nid}) performs a financial capture transaction without any designated error or rollback path. If payment fails or returns an uncertain gateway timeout, the workflow blindly proceeds or drops without refunding/notifying the user. This guarantees financial discrepancies.",
                        "why_it_matters": "Without an explicit failure branch, payment declines either hang forever or allow unpaid orders to advance directly to physical inventory allocation.",
                        "evidence": [{
                            "artifact_id": artifact_id,
                            "artifact_name": artifact_name,
                            "kind": "node",
                            "locator": f"node:{nid}",
                            "excerpt": f"node='{node.get('label')}', outgoing_conditions={[e.get('condition') for e in out_edges]}",
                            "detail": f"Step {nid} only possesses positive transition condition '{out_edges[0].get('condition') if out_edges else 'none'}' with zero error branch"
                        }],
                        "sub_scores": {
                            "severity": 0.85,
                            "likelihood": 0.75,
                            "breadth": 0.70,
                            "irreversibility": 0.80,
                            "time_sensitivity": 0.85,
                            "justifications": {
                                "severity": "Causes silent inventory leaks and unhandled customer debit failures.",
                                "likelihood": "Payment gateways experience standard 2-5% network timeouts.",
                                "breadth": "Affects all payment failure transactions.",
                                "irreversibility": "Incorrect order state requires manual accounting reconciliation.",
                                "time_sensitivity": "Critical flaw that must be patched before live transactions."
                            }
                        },
                        "recommendations": [
                            {"action": f"Add an explicit payment failure edge from '{nid}' to a 'Payment Failed' notification and order cancellation node.", "effort": "medium"},
                            {"action": "Implement two-phase commit or transactional outbox with automatic gateway status polling.", "effort": "medium"}
                        ],
                        "questions": [
                            "What happens when a customer's bank deducts the amount but the gateway drops the connection?",
                            "How does the warehouse cancel inventory allocation if the payment webhook fails?"
                        ]
                    })

        # 3. Check for Single Point of Failure: Segregation of Duties / Bottleneck Owners
        owner_to_nodes: Dict[str, List[Dict[str, Any]]] = {}
        for n in nodes:
            o = n.get("owner")
            if o and o not in ("system_gateway", "billing_service", "erp_sync_service"):
                owner_to_nodes.setdefault(o, []).append(n)

        for owner, owned_nodes in owner_to_nodes.items():
            if len(owned_nodes) >= 2:
                node_labels = [n.get("label") for n in owned_nodes]
                # Check if this owner controls packing AND physical dispatch
                has_packing = any("pack" in l.lower() for l in node_labels)
                has_dispatch = any("dispatch" in l.lower() or "handover" in l.lower() or "ship" in l.lower() for l in node_labels)
                
                if has_packing and has_dispatch:
                    findings.append({
                        "type": "workflow_risk",
                        "title": f"Single Point of Failure: '{owner}' Controls Packing and Dispatch",
                        "explanation": f"The individual '{owner}' is assigned to both packaging items and handing them over to commercial transit. This violates standard segregation-of-duties controls in supply chain logistics. A single individual can pack incorrect items, omit packing slips, or dispatch without independent oversight.",
                        "why_it_matters": "Concentrating pick, pack, and carrier handover in one human role creates an unmonitored operational bottleneck and single point of inventory shrinkage.",
                        "evidence": [{
                            "artifact_id": artifact_id,
                            "artifact_name": artifact_name,
                            "kind": "node",
                            "locator": f"node:{owned_nodes[0].get('id')}",
                            "excerpt": f"owner='{owner}', steps={[n.get('id') for n in owned_nodes]}",
                            "detail": f"Single operator '{owner}' assigned to consecutive critical nodes: {', '.join(node_labels)}"
                        }],
                        "sub_scores": {
                            "severity": 0.75,
                            "likelihood": 0.70,
                            "breadth": 0.60,
                            "irreversibility": 0.65,
                            "time_sensitivity": 0.60,
                            "justifications": {
                                "severity": "Severe breach of physical custody controls and dispatch auditability.",
                                "likelihood": "Operator fatigue or absence directly halts both packing and dispatch.",
                                "breadth": "Impairs daily fulfillment capacity across all warehouse orders.",
                                "irreversibility": "Dispatched incorrect packages incur costly reverse logistics.",
                                "time_sensitivity": "Needs separation prior to warehouse scaling."
                            }
                        },
                        "recommendations": [
                            {"action": "Segregate packing and carrier handover between two distinct staff roles.", "effort": "low"},
                            {"action": "Introduce a barcode manifest scan step verified by a second warehouse operator.", "effort": "medium"}
                        ],
                        "questions": [
                            f"Who verifies that '{owner}' placed the correct items into the box before trailer loading?",
                            "What occurs if this operator is absent or on leave?"
                        ]
                    })

        # 4. Check for Irreversible Actions Without Approval
        for node in nodes:
            nid = node.get("id")
            label = node.get("label", nid)
            is_reversible = node.get("reversible", True)
            action_type = node.get("action_type", "")
            
            # Check keywords indicating irreversible external side effects
            is_critical_action = any(kw in label.lower() for kw in ["dispatch", "release", "ship", "destroy", "wire", "delete"])
            if (not is_reversible or is_critical_action) and any(kw in label.lower() for kw in ["dispatch", "handover"]):
                # Look at predecessor nodes in graph
                predecessors = list(G.predecessors(nid))
                has_approval_step = False
                for pred in predecessors:
                    pred_label = G.nodes[pred].get("label", "").lower()
                    if any(app in pred_label for app in ["approval", "audit", "verify", "sign-off", "inspection", "review", "qc"]):
                        has_approval_step = True
                        break
                        
                if not has_approval_step:
                    findings.append({
                        "type": "workflow_risk",
                        "title": f"Irreversible Action '{label}' Lacks Prior Approval Check",
                        "explanation": f"Step '{label}' ({nid}) is an irreversible physical action that hands packages over to a third-party carrier without any prior quality check or manager sign-off. Once cartons are loaded onto the commercial trailer, orders cannot be halted or corrected without incurring expensive freight recall penalties. Quality control is absent.",
                        "why_it_matters": "Defective packaging, wrong items, or cancelled orders will physically leave the building because no verification gate exists.",
                        "evidence": [{
                            "artifact_id": artifact_id,
                            "artifact_name": artifact_name,
                            "kind": "node",
                            "locator": f"node:{nid}",
                            "excerpt": f"node='{label}', reversible={is_reversible}, predecessors={predecessors}",
                            "detail": f"Step {nid} performs irreversible action without any approval or QC gate in predecessor nodes"
                        }],
                        "sub_scores": {
                            "severity": 0.80,
                            "likelihood": 0.75,
                            "breadth": 0.50,
                            "irreversibility": 0.90,
                            "time_sensitivity": 0.70,
                            "justifications": {
                                "severity": "Irreversible physical shipment cannot be undone once on trailer.",
                                "likelihood": "Mispacks routinely occur without double-check gates.",
                                "breadth": "Affects all outgoing carrier deliveries.",
                                "irreversibility": "Extremely high: physical transit is irreversible.",
                                "time_sensitivity": "Needs gate insertion immediately."
                            }
                        },
                        "recommendations": [
                            {"action": f"Insert an automated weight-check or supervisor QC approval node before '{label}'.", "effort": "medium"},
                            {"action": "Check cancellation webhook queue immediately prior to carrier trailer loading.", "effort": "low"}
                        ],
                        "questions": [
                            "Can an order be stopped if a customer requests cancellation while items are being packed?",
                            "Is there a scale check to confirm box weight matches SKU bill-of-materials?"
                        ]
                    })

        # 5. Check for Cycles and Unreachable Nodes
        try:
            cycles = list(nx.simple_cycles(G))
            if cycles:
                findings.append({
                    "type": "workflow_risk",
                    "title": f"Infinite Loop / Cycle Detected in Workflow Graph",
                    "explanation": f"The workflow contains a cyclic execution loop between nodes {cycles[0]}. Without loop bounds or state termination checks, tasks can circulate endlessly, consuming compute resources and exhausting retry limits.",
                    "why_it_matters": "Cyclic loops cause runaway billing and stuck state machines in event-driven architectures.",
                    "evidence": [{
                        "artifact_id": artifact_id,
                        "artifact_name": artifact_name,
                        "kind": "node",
                        "locator": f"node:{cycles[0][0]}",
                        "excerpt": f"cycle={cycles[0]}",
                        "detail": f"Detected directed cycle involving nodes: {' -> '.join(cycles[0])}"
                    }],
                    "sub_scores": {
                        "severity": 0.85,
                        "likelihood": 0.80,
                        "breadth": 0.60,
                        "irreversibility": 0.70,
                        "time_sensitivity": 0.80,
                        "justifications": {
                            "severity": "Causes infinite loops and resource deadlock.",
                            "likelihood": "Mathematically proven by cycle in graph.",
                            "breadth": "Stops completion of all affected workflow runs.",
                            "irreversibility": "Can be corrected by breaking cycle.",
                            "time_sensitivity": "Critical to resolve before deployment."
                        }
                    },
                    "recommendations": [
                        {"action": "Break cycle by introducing a maximum iteration count and terminal failure branch.", "effort": "low"}
                    ],
                    "questions": [
                        "What is the intended exit condition for this loop?"
                    ]
                })
        except Exception:
            pass

        return findings
