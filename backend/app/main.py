import os
import json
import asyncio
from typing import List, Optional, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from sqlmodel import Session, select

from .db import init_db, get_session
from .models import (
    Project, ProjectCreate, Artifact, ArtifactCreateText,
    Finding, FindingPatch, ProjectModelRecord, ReweightPayload,
    ProjectResults
)
from .ingest.text import parse_text_with_offsets, normalize_text
from .ingest.pdf import parse_pdf
from .ingest.docx import parse_docx
from .ingest.dataset import load_dataframe, profile_dataset
from .ingest.workflow import parse_workflow_data
from .extract.project_model import extract_project_model_from_artifacts
from .analyzers.data_risk import DataRiskAnalyzer
from .analyzers.workflow_risk import WorkflowRiskAnalyzer
from .analyzers.contradictions import ContradictionAnalyzer
from .llm.client import LLMClient, is_demo_mode_active, load_precomputed_results
from .scoring import score_finding, calculate_impact, calculate_confidence, calculate_priority, determine_tier
from .report import generate_markdown_report, generate_pdf_report


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt", ".csv", ".xlsx", ".xls", ".json", ".yaml", ".yml"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


# Ensure tables are created immediately
init_db()


app = FastAPI(
    title="BlindSpot AI API",
    version="1.0.0",
    description="Find missing assumptions, overlooked constraints, and unasked questions backed by evidence.",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "demo_mode": is_demo_mode_active(),
        "gemini_model": os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    }


# --- Project Endpoints ---

@app.post("/api/projects", response_model=Project)
def create_project(payload: ProjectCreate, session: Session = Depends(get_session)):
    project = Project(
        name=payload.name,
        goal=payload.goal or "",
        domain=payload.domain or "general",
        status="created",
        progress_pct=0,
        status_message="Project created. Upload artifacts to begin analysis.",
        is_demo_mode=is_demo_mode_active()
    )
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.get("/api/projects", response_model=List[Project])
def list_projects(session: Session = Depends(get_session)):
    statement = select(Project).order_by(Project.created_at.desc())
    return session.exec(statement).all()


@app.get("/api/projects/{project_id}", response_model=Project)
def get_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Cascade delete artifacts, findings, model
    artifacts = session.exec(select(Artifact).where(Artifact.project_id == project_id)).all()
    for a in artifacts:
        session.delete(a)
    findings = session.exec(select(Finding).where(Finding.project_id == project_id)).all()
    for f in findings:
        session.delete(f)
    models = session.exec(select(ProjectModelRecord).where(ProjectModelRecord.project_id == project_id)).all()
    for m in models:
        session.delete(m)

    session.delete(project)
    session.commit()
    return {"status": "deleted", "id": project_id}


# --- Artifact Ingestion Endpoints ---

@app.post("/api/projects/{project_id}/artifacts")
async def upload_artifact(
    project_id: int,
    file: Optional[UploadFile] = File(None),
    pasted_text: Optional[str] = Form(None),
    name: Optional[str] = Form(None),
    kind: Optional[str] = Form("document"),  # document, dataset, workflow
    session: Session = Depends(get_session)
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    content_bytes = None
    file_name = name or "untitled"
    content_type = "text/plain"
    size_bytes = 0

    if file:
        file_name = name or file.filename or "uploaded_file"
        ext = os.path.splitext(file_name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            )
        
        content_bytes = await file.read()
        size_bytes = len(content_bytes)
        if size_bytes > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")
        
        content_type = file.content_type or "application/octet-stream"

        # Determine kind if not explicit
        if ext in (".csv", ".xlsx", ".xls"):
            kind = "dataset"
        elif ext in (".json", ".yaml", ".yml"):
            # Check if workflow or document
            try:
                raw_str = content_bytes.decode("utf-8", errors="ignore")
                if "nodes" in raw_str and "edges" in raw_str:
                    kind = "workflow"
            except Exception:
                pass
    elif pasted_text:
        content_bytes = pasted_text.encode("utf-8")
        size_bytes = len(content_bytes)
        file_name = name or "Pasted Document"
        ext = ".txt"
        content_type = "text/plain"
    else:
        raise HTTPException(status_code=400, detail="Either file or pasted_text must be provided")

    # Ingestion Stage 1: Parse content
    raw_text = None
    parsed_data = None

    try:
        if kind == "dataset":
            df = load_dataframe(content_bytes=content_bytes, filename=file_name)
            profile = profile_dataset(df)
            parsed_data = profile
            raw_text = f"Dataset: {file_name} ({profile['row_count']} rows, {profile['col_count']} columns)"
        elif kind == "workflow":
            text_str = content_bytes.decode("utf-8", errors="ignore")
            raw_text = text_str
            parsed_data = parse_workflow_data(text_str)
        else:  # document
            ext = os.path.splitext(file_name)[1].lower()
            if ext == ".pdf":
                # Save temp file for pdfplumber
                temp_path = f"/tmp/{project_id}_{file_name}"
                with open(temp_path, "wb") as f:
                    f.write(content_bytes)
                pdf_res = parse_pdf(temp_path)
                raw_text = pdf_res["text"]
                parsed_data = {"page_count": pdf_res["page_count"], "pages": pdf_res["pages"]}
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            elif ext == ".docx":
                temp_path = f"/tmp/{project_id}_{file_name}"
                with open(temp_path, "wb") as f:
                    f.write(content_bytes)
                docx_res = parse_docx(temp_path)
                raw_text = docx_res["text"]
                parsed_data = {"paragraph_count": docx_res["paragraph_count"], "paragraphs": docx_res["paragraphs"]}
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            else:
                text_str = content_bytes.decode("utf-8", errors="ignore")
                parsed_text = parse_text_with_offsets(text_str)
                raw_text = parsed_text["text"]
                parsed_data = {"char_count": parsed_text["char_count"], "line_count": parsed_text["line_count"]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to ingest {file_name}: {str(e)}")

    artifact = Artifact(
        project_id=project_id,
        name=file_name,
        kind=kind,
        content_type=content_type,
        size_bytes=size_bytes,
        raw_text=raw_text,
        parsed_data=parsed_data
    )
    session.add(artifact)
    session.commit()
    session.refresh(artifact)
    return artifact


# --- Background Analysis Execution Pipeline ---

def execute_analysis_pipeline(project_id: int):
    """
    Stage 1: INGEST (already parsed on upload, verified here)
    Stage 2: EXTRACT (LLM builds Project Model JSON with source quotes & offsets)
    Stage 3: DETECT (DataRiskAnalyzer, WorkflowRiskAnalyzer, ContradictionAnalyzer, LLM Gap Reasoning)
    Stage 4: RANK & RECOMMEND (Score validation, priority calculation, action plan)
    """
    from .db import engine
    with Session(engine) as session:
        project = session.get(Project, project_id)
        if not project:
            return

        try:
            # Stage 1: INGEST Check
            project.status = "ingest"
            project.progress_pct = 15
            project.status_message = "Ingesting artifacts and indexing token offsets..."
            session.add(project)
            session.commit()

            artifacts = session.exec(select(Artifact).where(Artifact.project_id == project_id)).all()
            if not artifacts:
                project.status = "failed"
                project.status_message = "No artifacts uploaded to analyze."
                session.add(project)
                session.commit()
                return

            artifacts_dicts = [a.model_dump() for a in artifacts]

            # Stage 2: EXTRACT Project Model
            project.status = "extract"
            project.progress_pct = 35
            project.status_message = "Extracting goals, stated assumptions, constraints, and dependencies..."
            session.add(project)
            session.commit()

            llm_client = LLMClient()
            project.is_demo_mode = llm_client.is_demo
            session.add(project)
            session.commit()

            project_model = extract_project_model_from_artifacts(
                artifacts=artifacts_dicts,
                project_name=project.name,
                llm_client=llm_client
            )

            # Store project model record
            existing_pm = session.exec(select(ProjectModelRecord).where(ProjectModelRecord.project_id == project_id)).first()
            if existing_pm:
                existing_pm.model_json = project_model
                session.add(existing_pm)
            else:
                pm_record = ProjectModelRecord(project_id=project_id, model_json=project_model)
                session.add(pm_record)
            session.commit()

            # Stage 3: DETECT (Parallel Deterministic Analyzers + LLM Gap Reasoning)
            project.status = "detect"
            project.progress_pct = 65
            project.status_message = "Running deterministic analyzers and domain gap reasoning..."
            session.add(project)
            session.commit()

            all_raw_findings: List[Dict[str, Any]] = []

            # 3a. Deterministic Data Risk
            data_analyzer = DataRiskAnalyzer()
            for a in artifacts:
                if a.kind == "dataset" and a.parsed_data:
                    data_findings = data_analyzer.analyze(a.parsed_data, {"artifact_id": a.id, "artifact_name": a.name})
                    all_raw_findings.extend(data_findings)

            # 3b. Deterministic Workflow Risk
            wf_analyzer = WorkflowRiskAnalyzer()
            for a in artifacts:
                if a.kind == "workflow" and a.parsed_data:
                    wf_findings = wf_analyzer.analyze(a.parsed_data, {"artifact_id": a.id, "artifact_name": a.name})
                    all_raw_findings.extend(wf_findings)

            # 3c. Contradiction Pass
            contra_analyzer = ContradictionAnalyzer()
            contra_findings = contra_analyzer.analyze(None, {"artifacts": artifacts_dicts, "project_name": project.name})
            all_raw_findings.extend(contra_findings)

            # 3d. LLM Gap Reasoning
            artifacts_summary_parts = []
            for a in artifacts:
                artifacts_summary_parts.append(f"Artifact ID: {a.id}, Name: {a.name}, Kind: {a.kind}\nText Excerpt:\n{(a.raw_text or '')[:8000]}")
            artifacts_summary = "\n\n".join(artifacts_summary_parts)

            llm_findings = llm_client.run_gap_reasoning(
                project_name=project.name,
                project_model=project_model,
                artifacts_summary=artifacts_summary
            )
            all_raw_findings.extend(llm_findings)

            # Stage 4: RANK & RECOMMEND
            project.status = "rank"
            project.progress_pct = 85
            project.status_message = "Validating tangible evidence and computing impact-priority scores..."
            session.add(project)
            session.commit()

            # Clear any old findings for this project
            old_findings = session.exec(select(Finding).where(Finding.project_id == project_id)).all()
            for of in old_findings:
                session.delete(of)
            session.commit()

            # Evidence Validation & Deduplication
            seen_titles = set()
            valid_findings: List[Finding] = []

            # Map primary doc ID
            primary_doc = next((a for a in artifacts if a.kind == "document"), artifacts[0])

            for f_dict in all_raw_findings:
                title = f_dict.get("title", "").strip()
                if not title or title.lower() in seen_titles:
                    continue
                seen_titles.add(title.lower())

                evidence_list = f_dict.get("evidence", [])
                if not evidence_list:
                    # Drop findings without evidence as per core principle
                    continue

                # Ensure artifact_id is populated on evidence items
                for ev in evidence_list:
                    if not ev.get("artifact_id"):
                        ev["artifact_id"] = primary_doc.id
                        ev["artifact_name"] = primary_doc.name

                # Score finding
                scored_f = score_finding(f_dict)

                finding_obj = Finding(
                    project_id=project_id,
                    type=scored_f.get("type", "missing_assumption"),
                    title=scored_f.get("title", ""),
                    explanation=scored_f.get("explanation", ""),
                    why_it_matters=scored_f.get("why_it_matters", ""),
                    evidence=scored_f.get("evidence", []),
                    sub_scores=scored_f.get("sub_scores", {}),
                    impact=scored_f.get("impact", 0.0),
                    confidence=scored_f.get("confidence", 0.0),
                    priority=scored_f.get("priority", 0.0),
                    tier=scored_f.get("tier", "Medium"),
                    recommendations=scored_f.get("recommendations", []),
                    questions=scored_f.get("questions", []),
                    status="open"
                )
                session.add(finding_obj)

            project.status = "done"
            project.progress_pct = 100
            project.status_message = "Analysis complete. All blind spots identified with evidence."
            session.add(project)
            session.commit()

        except Exception as e:
            project.status = "failed"
            project.status_message = f"Analysis error: {str(e)}"
            session.add(project)
            session.commit()


@app.post("/api/projects/{project_id}/analyze")
def trigger_analysis(project_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.status = "ingest"
    project.progress_pct = 5
    project.status_message = "Initializing analysis pipeline..."
    session.add(project)
    session.commit()

    background_tasks.add_task(execute_analysis_pipeline, project_id)
    return {"status": "started", "project_id": project_id}


@app.get("/api/projects/{project_id}/status")
def get_project_status(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "id": project.id,
        "status": project.status,
        "progress_pct": project.progress_pct,
        "status_message": project.status_message,
        "is_demo_mode": project.is_demo_mode
    }


@app.get("/api/projects/{project_id}/results", response_model=ProjectResults)
def get_project_results(project_id: int, session: Session = Depends(get_session)):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    artifacts = session.exec(select(Artifact).where(Artifact.project_id == project_id)).all()
    findings = session.exec(select(Finding).where(Finding.project_id == project_id).order_by(Finding.priority.desc())).all()
    pm_rec = session.exec(select(ProjectModelRecord).where(ProjectModelRecord.project_id == project_id)).first()

    # Aggregate executive summary
    crit = len([f for f in findings if f.tier == "Critical"])
    high = len([f for f in findings if f.tier == "High"])
    med = len([f for f in findings if f.tier == "Medium"])
    low = len([f for f in findings if f.tier == "Low"])

    type_counts: Dict[str, int] = {}
    for f in findings:
        type_counts[f.type] = type_counts.get(f.type, 0) + 1

    summary = {
        "total_findings": len(findings),
        "critical_count": crit,
        "high_count": high,
        "medium_count": med,
        "low_count": low,
        "type_counts": type_counts,
        "top_risks": [f.model_dump() for f in findings[:5]],
        "is_demo_mode": project.is_demo_mode
    }

    return ProjectResults(
        project=project,
        artifacts=artifacts,
        findings=findings,
        project_model=pm_rec.model_json if pm_rec else None,
        summary=summary
    )


# --- Finding Modification & Live Re-weighting Endpoints ---

@app.patch("/api/findings/{finding_id}", response_model=Finding)
def patch_finding(finding_id: int, payload: FindingPatch, session: Session = Depends(get_session)):
    finding = session.get(Finding, finding_id)
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    if payload.status is not None:
        if payload.status not in ("open", "accepted", "dismissed", "resolved"):
            raise HTTPException(status_code=400, detail="Invalid status. Must be open, accepted, dismissed, or resolved.")
        finding.status = payload.status
    if payload.note is not None:
        finding.note = payload.note

    session.add(finding)
    session.commit()
    session.refresh(finding)
    return finding


@app.post("/api/projects/{project_id}/reweight")
def reweight_project_findings(project_id: int, payload: ReweightPayload, session: Session = Depends(get_session)):
    """
    Recomputes impact, priority, and tier across all findings using custom weights
    without calling the LLM again.
    """
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    findings = session.exec(select(Finding).where(Finding.project_id == project_id)).all()
    weights = payload.model_dump()

    for f in findings:
        sub_scores = f.sub_scores or {}
        new_impact = calculate_impact(sub_scores, weights)
        f.impact = new_impact
        f.priority = calculate_priority(new_impact, f.confidence)
        f.tier = determine_tier(new_impact)
        session.add(f)

    session.commit()
    return {"status": "reweighted", "findings_updated": len(findings)}


# --- Export Endpoints ---

@app.get("/api/projects/{project_id}/export")
def export_project(
    project_id: int,
    format: str = Query("json", pattern="^(pdf|md|json)$"),
    session: Session = Depends(get_session)
):
    project = session.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    artifacts = session.exec(select(Artifact).where(Artifact.project_id == project_id)).all()
    findings = session.exec(select(Finding).where(Finding.project_id == project_id).order_by(Finding.priority.desc())).all()

    p_dict = project.model_dump()
    a_dicts = [a.model_dump() for a in artifacts]
    f_dicts = [f.model_dump() for f in findings]

    if format == "pdf":
        pdf_bytes = generate_pdf_report(p_dict, a_dicts, f_dicts)
        filename = f"BlindSpot_Report_{project.name.replace(' ', '_')}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    elif format == "md":
        md_text = generate_markdown_report(p_dict, a_dicts, f_dicts)
        filename = f"BlindSpot_Report_{project.name.replace(' ', '_')}.md"
        return Response(
            content=md_text,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    else:  # json
        data = {
            "project": p_dict,
            "artifacts": a_dicts,
            "findings": f_dicts
        }
        return JSONResponse(content=jsonable_encoder(data))


# --- Instant Sample Seeder Endpoint ---

@app.post("/api/samples/{sample_name}")
def seed_sample_project(sample_name: str, session: Session = Depends(get_session)):
    """
    Seeds one of the 3 realistic sample projects:
    1. 'startup_prd'
    2. 'student_performance'
    3. 'order_fulfillment'
    Instantly populates artifacts and precomputed results for demo readiness!
    """
    samples_dir = os.path.join(os.path.dirname(__file__), "samples")
    
    if sample_name == "startup_prd":
        project = Project(
            name="QuickBite Campus Food Delivery",
            goal="Deliver hot meals across campus dorms in 20 minutes for 1,000 orders/day",
            domain="Food Delivery / Logistics",
            status="done",
            progress_pct=100,
            status_message="Demo analysis ready with planted gaps identified.",
            is_demo_mode=True
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        # Ingest startup_prd.md
        prd_path = os.path.join(samples_dir, "startup_prd.md")
        with open(prd_path, "r") as f:
            raw_text = f.read()

        artifact = Artifact(
            project_id=project.id,
            name="QuickBite_Campus_PRD.md",
            kind="document",
            content_type="text/markdown",
            size_bytes=len(raw_text.encode("utf-8")),
            raw_text=raw_text,
            parsed_data={"line_count": len(raw_text.splitlines()), "char_count": len(raw_text)}
        )
        session.add(artifact)
        session.commit()
        session.refresh(artifact)

        # Populate findings from precomputed
        pre = load_precomputed_results().get("startup_prd", {})
        pm_record = ProjectModelRecord(project_id=project.id, model_json=pre.get("project_model", {}))
        session.add(pm_record)

        for f_data in pre.get("findings", []):
            scored = score_finding(f_data)
            for ev in scored.get("evidence", []):
                ev["artifact_id"] = artifact.id
                ev["artifact_name"] = artifact.name
            finding_obj = Finding(
                project_id=project.id,
                type=scored.get("type"),
                title=scored.get("title"),
                explanation=scored.get("explanation"),
                why_it_matters=scored.get("why_it_matters"),
                evidence=scored.get("evidence", []),
                sub_scores=scored.get("sub_scores", {}),
                impact=scored.get("impact"),
                confidence=scored.get("confidence"),
                priority=scored.get("priority"),
                tier=scored.get("tier"),
                recommendations=scored.get("recommendations", []),
                questions=scored.get("questions", []),
                status="open"
            )
            session.add(finding_obj)

        session.commit()
        return {"project_id": project.id, "name": project.name, "status": "seeded"}

    elif sample_name == "student_performance":
        project = Project(
            name="Student Academic Risk Prediction",
            goal="Predict student dropout and academic failure early for counselor outreach",
            domain="Education / Machine Learning",
            status="done",
            progress_pct=100,
            status_message="Demo analysis ready with planted data risks identified.",
            is_demo_mode=True
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        csv_path = os.path.join(samples_dir, "student_performance.csv")
        df = load_dataframe(file_path=csv_path)
        profile = profile_dataset(df)

        artifact = Artifact(
            project_id=project.id,
            name="student_performance_cohort.csv",
            kind="dataset",
            content_type="text/csv",
            size_bytes=os.path.getsize(csv_path),
            raw_text=f"Student Performance Dataset (1,500 records, 11 features)",
            parsed_data=profile
        )
        session.add(artifact)
        session.commit()
        session.refresh(artifact)

        pre = load_precomputed_results().get("student_performance", {})
        pm_record = ProjectModelRecord(project_id=project.id, model_json=pre.get("project_model", {}))
        session.add(pm_record)

        for f_data in pre.get("findings", []):
            scored = score_finding(f_data)
            for ev in scored.get("evidence", []):
                ev["artifact_id"] = artifact.id
                ev["artifact_name"] = artifact.name
            finding_obj = Finding(
                project_id=project.id,
                type=scored.get("type"),
                title=scored.get("title"),
                explanation=scored.get("explanation"),
                why_it_matters=scored.get("why_it_matters"),
                evidence=scored.get("evidence", []),
                sub_scores=scored.get("sub_scores", {}),
                impact=scored.get("impact"),
                confidence=scored.get("confidence"),
                priority=scored.get("priority"),
                tier=scored.get("tier"),
                recommendations=scored.get("recommendations", []),
                questions=scored.get("questions", []),
                status="open"
            )
            session.add(finding_obj)

        session.commit()
        return {"project_id": project.id, "name": project.name, "status": "seeded"}

    elif sample_name == "order_fulfillment":
        project = Project(
            name="E-Commerce Order Fulfillment Pipeline",
            goal="Process customer cart orders into physical carrier dispatch and tracking",
            domain="Supply Chain / Workflow",
            status="done",
            progress_pct=100,
            status_message="Demo analysis ready with planted workflow risks identified.",
            is_demo_mode=True
        )
        session.add(project)
        session.commit()
        session.refresh(project)

        json_path = os.path.join(samples_dir, "order_fulfillment.json")
        with open(json_path, "r") as f:
            wf_text = f.read()

        wf_data = parse_workflow_data(wf_text)
        artifact = Artifact(
            project_id=project.id,
            name="order_fulfillment_pipeline.json",
            kind="workflow",
            content_type="application/json",
            size_bytes=len(wf_text.encode("utf-8")),
            raw_text=wf_text,
            parsed_data=wf_data
        )
        session.add(artifact)
        session.commit()
        session.refresh(artifact)

        pre = load_precomputed_results().get("order_fulfillment", {})
        pm_record = ProjectModelRecord(project_id=project.id, model_json=pre.get("project_model", {}))
        session.add(pm_record)

        for f_data in pre.get("findings", []):
            scored = score_finding(f_data)
            for ev in scored.get("evidence", []):
                ev["artifact_id"] = artifact.id
                ev["artifact_name"] = artifact.name
            finding_obj = Finding(
                project_id=project.id,
                type=scored.get("type"),
                title=scored.get("title"),
                explanation=scored.get("explanation"),
                why_it_matters=scored.get("why_it_matters"),
                evidence=scored.get("evidence", []),
                sub_scores=scored.get("sub_scores", {}),
                impact=scored.get("impact"),
                confidence=scored.get("confidence"),
                priority=scored.get("priority"),
                tier=scored.get("tier"),
                recommendations=scored.get("recommendations", []),
                questions=scored.get("questions", []),
                status="open"
            )
            session.add(finding_obj)

        session.commit()
        return {"project_id": project.id, "name": project.name, "status": "seeded"}

    else:
        raise HTTPException(status_code=404, detail=f"Unknown sample project '{sample_name}'. Options: startup_prd, student_performance, order_fulfillment")
