import { Project, ProjectResults, Finding, ReweightPayload } from '@/types';

// Connect directly to backend at port 8000
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API_BASE = `${BACKEND_URL}/api`;

export async function fetchHealth(): Promise<{ status: string; demo_mode: boolean; gemini_model: string }> {
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch projects' }));
    throw new Error(err.detail || 'Failed to fetch projects');
  }
  return res.json();
}

export async function createProject(name: string, goal?: string, domain?: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, goal, domain }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create project' }));
    throw new Error(err.detail || 'Failed to create project');
  }
  return res.json();
}

export async function uploadArtifact(
  projectId: number,
  params: {
    file?: File;
    pastedText?: string;
    name?: string;
    kind?: 'document' | 'dataset' | 'workflow';
  }
) {
  const formData = new FormData();
  if (params.file) {
    formData.append('file', params.file);
  }
  if (params.pastedText) {
    formData.append('pasted_text', params.pastedText);
  }
  if (params.name) {
    formData.append('name', params.name);
  }
  if (params.kind) {
    formData.append('kind', params.kind);
  }

  const res = await fetch(`${API_BASE}/projects/${projectId}/artifacts`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export async function triggerAnalysis(projectId: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/analyze`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to start analysis' }));
    throw new Error(err.detail || 'Failed to start analysis');
  }
  return res.json();
}

export async function getProjectStatus(projectId: number): Promise<{
  id: number;
  status: string;
  progress_pct: number;
  status_message: string;
  is_demo_mode: boolean;
}> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to get status' }));
    throw new Error(err.detail || 'Failed to get status');
  }
  return res.json();
}

export async function getProjectResults(projectId: number): Promise<ProjectResults> {
  const res = await fetch(`${API_BASE}/projects/${projectId}/results`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to get project results' }));
    throw new Error(err.detail || 'Failed to get project results');
  }
  return res.json();
}

export async function patchFinding(findingId: number, update: { status?: string; note?: string }): Promise<Finding> {
  const res = await fetch(`${API_BASE}/findings/${findingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update finding' }));
    throw new Error(err.detail || 'Failed to update finding');
  }
  return res.json();
}

export async function reweightProject(projectId: number, weights: ReweightPayload) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/reweight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(weights),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to re-weight findings' }));
    throw new Error(err.detail || 'Failed to re-weight findings');
  }
  return res.json();
}

export async function seedSample(sampleName: string): Promise<{ project_id: number; name: string }> {
  const res = await fetch(`${API_BASE}/samples/${sampleName}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Failed to seed sample ${sampleName}` }));
    throw new Error(err.detail || `Failed to seed sample ${sampleName}`);
  }
  return res.json();
}

export function getExportUrl(projectId: number, format: 'pdf' | 'md' | 'json'): string {
  return `${API_BASE}/projects/${projectId}/export?format=${format}`;
}
