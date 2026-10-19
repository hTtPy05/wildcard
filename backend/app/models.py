import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, JSON, Column
from pydantic import BaseModel, Field as PyField


# --- SQLModel Entities for Database ---

class ProjectBase(SQLModel):
    name: str
    goal: Optional[str] = None
    domain: Optional[str] = "general"


class Project(ProjectBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    status: str = Field(default="created")  # created, ingesting, extracting, detecting, ranking, completed, failed
    progress_pct: int = Field(default=0)
    status_message: str = Field(default="Project initialized")
    is_demo_mode: bool = Field(default=False)
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))
    updated_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))


class ArtifactBase(SQLModel):
    name: str
    kind: str  # document, dataset, workflow
    content_type: Optional[str] = None
    size_bytes: Optional[int] = 0


class Artifact(ArtifactBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    raw_text: Optional[str] = None  # Normalized raw text for documents or JSON/YAML content
    file_path: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))  # profile or graph
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))


class ProjectModelRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(index=True, unique=True)
    model_json: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))


class Finding(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    project_id: int = Field(index=True)
    type: str  # missing_assumption, overlooked_constraint, unasked_question, contradiction, data_risk, workflow_risk
    title: str
    explanation: str
    why_it_matters: str
    evidence: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    sub_scores: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    impact: float = Field(default=0.0)
    confidence: float = Field(default=0.0)
    priority: float = Field(default=0.0)
    tier: str = Field(default="Medium")  # Critical, High, Medium, Low
    recommendations: List[Dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    questions: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    status: str = Field(default="open")  # open, accepted, dismissed, resolved
    note: Optional[str] = None
    created_at: datetime.datetime = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc))


# --- Pydantic Schemas for API Payloads & Responses ---

class ProjectCreate(BaseModel):
    name: str
    goal: Optional[str] = ""
    domain: Optional[str] = "general"


class ArtifactCreateText(BaseModel):
    name: str
    kind: str  # document, dataset, workflow
    text: str


class EvidenceItem(BaseModel):
    artifact_id: Optional[int] = None
    artifact_name: Optional[str] = None
    kind: str  # text_span, column_stat, node
    locator: str  # "offset:120-185", "column:attendance_rate", "node:step_4"
    excerpt: str  # exact span quote or stat string or node label
    detail: Optional[str] = None


class RecommendationItem(BaseModel):
    action: str
    effort: str = "medium"  # low, medium, high


class SubScoresModel(BaseModel):
    severity: float = 0.5
    likelihood: float = 0.5
    breadth: float = 0.5
    irreversibility: float = 0.5
    time_sensitivity: float = 0.5
    justifications: Optional[Dict[str, str]] = None


class FindingCreate(BaseModel):
    type: str
    title: str
    explanation: str
    why_it_matters: str
    evidence: List[EvidenceItem]
    sub_scores: SubScoresModel
    recommendations: List[RecommendationItem] = []
    questions: List[str] = []


class FindingPatch(BaseModel):
    status: Optional[str] = None  # open, accepted, dismissed, resolved
    note: Optional[str] = None


class ReweightPayload(BaseModel):
    severity: float = 0.35
    likelihood: float = 0.25
    breadth: float = 0.20
    irreversibility: float = 0.10
    time_sensitivity: float = 0.10


class ProjectResults(BaseModel):
    project: Project
    artifacts: List[Artifact]
    findings: List[Finding]
    project_model: Optional[Dict[str, Any]] = None
    summary: Dict[str, Any]
