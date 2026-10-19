export type Tier = 'Critical' | 'High' | 'Medium' | 'Low';
export type FindingType = 
  | 'missing_assumption' 
  | 'overlooked_constraint' 
  | 'unasked_question' 
  | 'contradiction' 
  | 'data_risk' 
  | 'workflow_risk';

export type FindingStatus = 'open' | 'accepted' | 'dismissed' | 'resolved';

export interface EvidenceItem {
  artifact_id?: number;
  artifact_name?: string;
  kind: 'text_span' | 'column_stat' | 'node';
  locator: string;
  excerpt: string;
  detail?: string;
}

export interface RecommendationItem {
  action: string;
  effort: 'low' | 'medium' | 'high';
}

export interface SubScores {
  severity: number;
  likelihood: number;
  breadth: number;
  irreversibility: number;
  time_sensitivity: number;
  justifications?: Record<string, string>;
}

export interface Finding {
  id: number;
  project_id: number;
  type: FindingType;
  title: string;
  explanation: string;
  why_it_matters: string;
  evidence: EvidenceItem[];
  sub_scores: SubScores;
  impact: number;
  confidence: number;
  priority: number;
  tier: Tier;
  recommendations: RecommendationItem[];
  questions: string[];
  status: FindingStatus;
  note?: string;
  created_at?: string;
}

export interface Artifact {
  id: number;
  project_id: number;
  name: string;
  kind: 'document' | 'dataset' | 'workflow';
  content_type?: string;
  size_bytes?: number;
  raw_text?: string;
  parsed_data?: any;
  created_at?: string;
}

export interface Project {
  id: number;
  name: string;
  goal?: string;
  domain?: string;
  status: 'created' | 'ingest' | 'extract' | 'detect' | 'rank' | 'done' | 'failed';
  progress_pct: number;
  status_message: string;
  is_demo_mode: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectResults {
  project: Project;
  artifacts: Artifact[];
  findings: Finding[];
  project_model?: any;
  summary: {
    total_findings: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    type_counts: Record<string, number>;
    top_risks: Finding[];
    is_demo_mode: boolean;
  };
}

export interface ReweightPayload {
  severity: number;
  likelihood: number;
  breadth: number;
  irreversibility: number;
  time_sensitivity: number;
}
