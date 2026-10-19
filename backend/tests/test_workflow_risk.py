import pytest
from app.ingest.workflow import parse_workflow_data
from app.analyzers.workflow_risk import WorkflowRiskAnalyzer


def test_workflow_risk_analyzer_detects_all_planted_risks():
    workflow_raw = """{
      "workflow_id": "test_wf",
      "nodes": [
        { "id": "step_1", "label": "Receive Order", "owner": "gateway", "reversible": true },
        { "id": "step_2", "label": "Authorize Payment", "owner": "billing", "reversible": false },
        { "id": "step_3", "label": "Allocate Inventory", "owner": "bot", "reversible": true },
        { "id": "step_4", "label": "Generate Pick List", "owner": null, "reversible": true },
        { "id": "step_5", "label": "Item Pick & Pack", "owner": "john_operator", "reversible": false },
        { "id": "step_6", "label": "Physical Dispatch & Carrier Handover", "owner": "john_operator", "reversible": false }
      ],
      "edges": [
        { "from": "step_1", "to": "step_2", "condition": "valid" },
        { "from": "step_2", "to": "step_3", "condition": "paid" },
        { "from": "step_3", "to": "step_4", "condition": "allocated" },
        { "from": "step_4", "to": "step_5", "condition": "printed" },
        { "from": "step_5", "to": "step_6", "condition": "packed" }
      ]
    }"""

    wf_dict = parse_workflow_data(workflow_raw)
    analyzer = WorkflowRiskAnalyzer()
    findings = analyzer.analyze(wf_dict, {"artifact_id": 1, "artifact_name": "order_test.json"})

    finding_types = [f["type"] for f in findings]
    finding_titles = " ".join([f["title"] for f in findings])

    assert all(t == "workflow_risk" for t in finding_types)
    assert len(findings) >= 4

    # 1. Unowned step
    assert "Unowned Workflow Step 'Generate Pick List'" in finding_titles
    # 2. Missing payment rollback
    assert "Missing Error and Rollback Path for 'Authorize Payment'" in finding_titles
    # 3. Segregation of duties / bottleneck owner
    assert "Single Point of Failure: 'john_operator' Controls Packing and Dispatch" in finding_titles
    # 4. Irreversible action without approval
    assert "Irreversible Action 'Physical Dispatch & Carrier Handover' Lacks Prior Approval Check" in finding_titles

    # Verify that every finding has at least one valid node evidence item
    for f in findings:
        assert len(f["evidence"]) >= 1
        ev = f["evidence"][0]
        assert ev["kind"] == "node"
        assert "node:" in ev["locator"]
        assert len(ev["excerpt"]) > 0
