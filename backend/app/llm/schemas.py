from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class SourceQuote(BaseModel):
    quote: str = Field(description="Exact verbatim excerpt from source artifact")
    start_offset: Optional[int] = Field(default=None, description="Starting character offset in source text")
    end_offset: Optional[int] = Field(default=None, description="Ending character offset in source text")
    artifact_id: Optional[int] = None


class ExtractedItem(BaseModel):
    text: str = Field(description="Summary of the goal, assumption, constraint, or risk")
    source: SourceQuote


class ProjectModelSchema(BaseModel):
    goals: List[ExtractedItem] = Field(default_factory=list)
    stakeholders: List[ExtractedItem] = Field(default_factory=list)
    features: List[ExtractedItem] = Field(default_factory=list)
    stated_assumptions: List[ExtractedItem] = Field(default_factory=list)
    stated_constraints: List[ExtractedItem] = Field(default_factory=list)
    dependencies: List[ExtractedItem] = Field(default_factory=list)
    metrics: List[ExtractedItem] = Field(default_factory=list)
    timeline: List[ExtractedItem] = Field(default_factory=list)
    budget: List[ExtractedItem] = Field(default_factory=list)
    risks: List[ExtractedItem] = Field(default_factory=list)


class LLMEvidenceItem(BaseModel):
    artifact_id: Optional[int] = None
    kind: str = Field(description="'text_span', 'column_stat', or 'node'")
    locator: str = Field(description="e.g. 'offset:100-240', 'column:attendance', 'node:step_2'")
    excerpt: str = Field(description="Verbatim text span, column statistic, or node label")
    detail: Optional[str] = Field(default=None, description="Brief note on how this constitutes evidence")


class LLMSubScores(BaseModel):
    severity: float = Field(ge=0.0, le=1.0, description="Severity of impact from 0.0 to 1.0")
    likelihood: float = Field(ge=0.0, le=1.0, description="Likelihood of occurrence from 0.0 to 1.0")
    breadth: float = Field(ge=0.0, le=1.0, description="Breadth across users/systems from 0.0 to 1.0")
    irreversibility: float = Field(ge=0.0, le=1.0, description="Difficulty of reversal from 0.0 to 1.0")
    time_sensitivity: float = Field(ge=0.0, le=1.0, description="Urgency from 0.0 to 1.0")
    justifications: Dict[str, str] = Field(default_factory=dict, description="One-line justification for each sub-score")


class LLMRecommendation(BaseModel):
    action: str = Field(description="Actionable remediation step")
    effort: str = Field(default="medium", description="'low', 'medium', or 'high'")


class LLMFinding(BaseModel):
    type: str = Field(description="'missing_assumption', 'overlooked_constraint', 'unasked_question', 'contradiction', 'data_risk', or 'workflow_risk'")
    title: str = Field(description="Concise headline, max 12 words")
    explanation: str = Field(description="2 to 3 sentences explaining the gap")
    why_it_matters: str = Field(description="Explanation of operational or business fallout")
    evidence: List[LLMEvidenceItem] = Field(min_length=1, description="At least one evidence item copied verbatim or citing computed stat/node")
    sub_scores: LLMSubScores
    recommendations: List[LLMRecommendation] = Field(default_factory=list)
    questions: List[str] = Field(default_factory=list)


class LLMAnalysisResponse(BaseModel):
    findings: List[LLMFinding] = Field(default_factory=list)
