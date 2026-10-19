import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "demo_mode" in data


def test_seed_sample_startup_prd():
    response = client.post("/api/samples/startup_prd")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "seeded"
    project_id = data["project_id"]

    # Verify results
    res = client.get(f"/api/projects/{project_id}/results")
    assert res.status_code == 200
    res_data = res.json()
    assert res_data["project"]["name"] == "QuickBite Campus Food Delivery"
    assert len(res_data["artifacts"]) == 1
    assert len(res_data["findings"]) >= 6

    # Verify that every finding has at least one evidence item
    for f in res_data["findings"]:
        assert len(f["evidence"]) >= 1
        assert f["impact"] > 0
        assert f["tier"] in ["Critical", "High", "Medium", "Low"]

    # Test patch finding
    first_finding_id = res_data["findings"][0]["id"]
    patch_res = client.patch(f"/api/findings/{first_finding_id}", json={"status": "accepted", "note": "Valid point"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "accepted"
    assert patch_res.json()["note"] == "Valid point"

    # Test reweight
    reweight_res = client.post(
        f"/api/projects/{project_id}/reweight",
        json={
            "severity": 0.50,
            "likelihood": 0.20,
            "breadth": 0.10,
            "irreversibility": 0.10,
            "time_sensitivity": 0.10
        }
    )
    assert reweight_res.status_code == 200
    assert reweight_res.json()["status"] == "reweighted"

    # Test exports
    json_export = client.get(f"/api/projects/{project_id}/export?format=json")
    assert json_export.status_code == 200

    md_export = client.get(f"/api/projects/{project_id}/export?format=md")
    assert md_export.status_code == 200
    assert "# BlindSpot AI Analysis Report" in md_export.text

    pdf_export = client.get(f"/api/projects/{project_id}/export?format=pdf")
    assert pdf_export.status_code == 200
    assert pdf_export.headers["content-type"] == "application/pdf"
    assert len(pdf_export.content) > 1000


def test_seed_student_performance_sample():
    response = client.post("/api/samples/student_performance")
    assert response.status_code == 200
    project_id = response.json()["project_id"]

    res = client.get(f"/api/projects/{project_id}/results")
    assert res.status_code == 200
    findings = res.json()["findings"]
    assert any("Leakage" in f["title"] for f in findings)
    assert any("PII" in f["title"] or "Identifiable" in f["title"] for f in findings)


def test_seed_order_fulfillment_sample():
    response = client.post("/api/samples/order_fulfillment")
    assert response.status_code == 200
    project_id = response.json()["project_id"]

    res = client.get(f"/api/projects/{project_id}/results")
    assert res.status_code == 200
    findings = res.json()["findings"]
    assert any("Unassigned" in f["title"] or "Unowned" in f["title"] for f in findings)
    assert any("Payment" in f["title"] for f in findings)
