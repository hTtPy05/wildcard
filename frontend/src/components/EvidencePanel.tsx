'use client';

import React, { useState, useMemo } from 'react';
import { EvidenceItem, Artifact } from '@/types';
import { FileText, Database, GitFork, AlertCircle, CheckCircle, ExternalLink, Hash } from 'lucide-react';

interface EvidencePanelProps {
  evidence: EvidenceItem[];
  artifacts: Artifact[];
}

export default function EvidencePanel({ evidence, artifacts }: EvidencePanelProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const activeEv = evidence[selectedIdx] || evidence[0];

  // Find corresponding artifact
  const matchedArtifact = useMemo(() => {
    if (!activeEv) return null;
    if (activeEv.artifact_id) {
      return artifacts.find(a => a.id === activeEv.artifact_id) || null;
    }
    return artifacts[0] || null;
  }, [activeEv, artifacts]);

  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center text-sm text-slate-500">
        No evidence cited for this item.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Evidence Source Tabs if multiple */}
      {evidence.length > 1 && (
        <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
          {evidence.map((ev, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors whitespace-nowrap ${
                selectedIdx === i
                  ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {ev.kind === 'text_span' && <FileText className="w-3.5 h-3.5" />}
              {ev.kind === 'column_stat' && <Database className="w-3.5 h-3.5" />}
              {ev.kind === 'node' && <GitFork className="w-3.5 h-3.5" />}
              <span>Evidence #{i + 1} ({ev.kind})</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Evidence Box */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300">
              {activeEv.kind.replace('_', ' ')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              {activeEv.locator}
            </span>
          </div>
          {matchedArtifact && (
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">
              {matchedArtifact.name}
            </span>
          )}
        </div>

        {/* Detail Note */}
        {activeEv.detail && (
          <p className="text-xs text-slate-600 dark:text-slate-400 italic">
            &bull; {activeEv.detail}
          </p>
        )}

        {/* 1. DOCUMENT EVIDENCE: Text with Span Highlight */}
        {activeEv.kind === 'text_span' && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Verbatim Extracted Quote:
            </div>
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 text-sm font-medium text-amber-950 dark:text-amber-200 leading-relaxed font-sans shadow-sm">
              &ldquo;{activeEv.excerpt}&rdquo;
            </div>

            {/* Context snippet from document if available */}
            {matchedArtifact?.raw_text && (
              <div className="mt-3">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Source Document Context:</span>
                  <span className="text-[10px] text-slate-400 font-mono">{activeEv.locator}</span>
                </div>
                <div className="max-h-56 overflow-y-auto p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-mono leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {renderHighlightedDocument(matchedArtifact.raw_text, activeEv.excerpt)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. DATASET EVIDENCE: Column Profiler & Distribution */}
        {activeEv.kind === 'column_stat' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Identified Column Metric:
            </div>
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-500 text-xs font-mono text-indigo-950 dark:text-indigo-200">
              {activeEv.excerpt}
            </div>

            {/* Column Profile Card */}
            {renderDatasetColumnCard(matchedArtifact, activeEv.locator)}
          </div>
        )}

        {/* 3. WORKFLOW EVIDENCE: Graph Node Visualization */}
        {activeEv.kind === 'node' && (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Workflow Node Violation:
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 text-xs font-mono text-red-950 dark:text-red-200">
              {activeEv.excerpt}
            </div>

            {/* Interactive Workflow Node Sequence Diagram */}
            {renderWorkflowDiagram(matchedArtifact, activeEv.locator)}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Highlights the excerpt within the source document text
 */
function renderHighlightedDocument(fullText: string, excerpt: string) {
  if (!fullText) return null;
  const cleanExcerpt = excerpt.trim();
  if (!cleanExcerpt || !fullText.includes(cleanExcerpt)) {
    // Show surrounding preview if exact match fails
    return fullText.slice(0, 800) + '...';
  }

  const parts = fullText.split(cleanExcerpt);
  return (
    <>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part}
          {index < parts.length - 1 && (
            <mark className="bg-amber-300 dark:bg-amber-500/30 text-amber-950 dark:text-amber-200 px-1 py-0.5 rounded font-semibold border-b-2 border-amber-500">
              {cleanExcerpt}
            </mark>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

/**
 * Renders dataset column statistics and distribution preview
 */
function renderDatasetColumnCard(artifact: Artifact | null, locator: string) {
  if (!artifact?.parsed_data?.columns) return null;
  const colName = locator.replace('column:', '').trim();
  const colStats = artifact.parsed_data.columns[colName];

  if (!colStats) return null;

  return (
    <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
      <div className="flex items-center justify-between font-semibold">
        <span className="text-slate-900 dark:text-slate-100 flex items-center space-x-1">
          <Hash className="w-3.5 h-3.5 text-brand-500" />
          <span>Column: {colStats.name}</span>
        </span>
        <span className="text-slate-500 uppercase">{colStats.type}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-[10px] text-slate-400 block">Missingness</span>
          <span className={`font-semibold ${colStats.null_pct > 20 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
            {colStats.null_pct}% ({colStats.null_count})
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block">Distinct Values</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">{colStats.unique_count}</span>
        </div>
        {colStats.min !== undefined && (
          <div>
            <span className="text-[10px] text-slate-400 block">Min / Max</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{colStats.min} / {colStats.max}</span>
          </div>
        )}
        {colStats.mean !== undefined && (
          <div>
            <span className="text-[10px] text-slate-400 block">Mean &plusmn; Std</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{colStats.mean}</span>
          </div>
        )}
      </div>

      {/* Top categories or samples */}
      {colStats.top_categories && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Category Distribution
          </span>
          <div className="space-y-1">
            {Object.entries(colStats.top_categories).map(([cat, pct]: any) => (
              <div key={cat} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{cat}</span>
                <div className="flex items-center space-x-2 w-32">
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 w-8 text-right">{pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders SVG sequence and highlighting for workflow node graphs
 */
function renderWorkflowDiagram(artifact: Artifact | null, locator: string) {
  const targetedNodeId = locator.replace('node:', '').trim();
  const nodes = artifact?.parsed_data?.nodes || [];

  if (nodes.length === 0) return null;

  return (
    <div className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        Workflow Pipeline Sequence Map:
      </div>
      <div className="flex items-center space-x-2 overflow-x-auto py-2">
        {nodes.map((node: any, idx: number) => {
          const isTargeted = node.id === targetedNodeId;
          return (
            <React.Fragment key={node.id}>
              <div
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs transition-all ${
                  isTargeted
                    ? 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 ring-2 ring-red-500/20 shadow-md font-semibold'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono text-slate-400">#{idx + 1}</span>
                  <span className="truncate max-w-[120px]">{node.label}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Owner: {node.owner || <span className="text-red-500 font-semibold">Unassigned</span>}
                </div>
              </div>
              {idx < nodes.length - 1 && (
                <div className="text-slate-400 flex-shrink-0">&rarr;</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
