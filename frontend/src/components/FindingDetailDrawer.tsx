'use client';

import React, { useState } from 'react';
import { Finding, Artifact } from '@/types';
import { formatTier, formatFindingType } from '@/lib/utils';
import EvidencePanel from './EvidencePanel';
import { X, CheckCircle2, Ban, CheckSquare, Sparkles, AlertTriangle, ArrowRight, HelpCircle, Lightbulb, MessageSquare } from 'lucide-react';

interface FindingDetailDrawerProps {
  finding: Finding | null;
  artifacts: Artifact[];
  onClose: () => void;
  onUpdateStatus: (findingId: number, status: 'open' | 'accepted' | 'dismissed' | 'resolved', note?: string) => Promise<void>;
}

export default function FindingDetailDrawer({ finding, artifacts, onClose, onUpdateStatus }: FindingDetailDrawerProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (finding) {
      setNote(finding.note || '');
    }
  }, [finding]);

  if (!finding) return null;

  const tierStyle = formatTier(finding.tier);
  const subScores = finding.sub_scores || { severity: 0.5, likelihood: 0.5, breadth: 0.5, irreversibility: 0.5, time_sensitivity: 0.5 };
  const justifications = subScores.justifications || {};

  const handleStatusChange = async (newStatus: 'open' | 'accepted' | 'dismissed' | 'resolved') => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(finding.id, newStatus, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNote = async () => {
    setIsSubmitting(true);
    try {
      await onUpdateStatus(finding.id, finding.status, note);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-950 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-2 pr-6">
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${tierStyle.badge}`}>
                {finding.tier}
              </span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {formatFindingType(finding.type)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {finding.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Explanation */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Blind Spot Analysis
            </h4>
            <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
              {finding.explanation}
            </p>
          </div>

          {/* Why It Matters */}
          <div className="p-4 rounded-xl bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-1.5">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Why It Matters & Operational Risk</span>
            </div>
            <p className="text-xs text-red-950 dark:text-red-200 leading-relaxed">
              {finding.why_it_matters}
            </p>
          </div>

          {/* Evidence Inspector */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Tangible Evidence ({finding.evidence.length})</span>
              <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold">Strict Citation Enforced</span>
            </h4>
            <EvidencePanel evidence={finding.evidence} artifacts={artifacts} />
          </div>

          {/* Sub-Scores Breakdown with Justifications */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Risk Formula Breakdown
              </h4>
              <div className="flex items-center space-x-3 text-xs">
                <span>Impact: <b className="text-brand-600 dark:text-brand-400">{finding.impact}</b></span>
                <span>Confidence: <b>{Math.round(finding.confidence * 100)}%</b></span>
                <span>Priority: <b>{finding.priority}</b></span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {[
                { label: 'Severity (35%)', key: 'severity', val: subScores.severity },
                { label: 'Likelihood (25%)', key: 'likelihood', val: subScores.likelihood },
                { label: 'Breadth (20%)', key: 'breadth', val: subScores.breadth },
                { label: 'Irreversibility (10%)', key: 'irreversibility', val: subScores.irreversibility },
                { label: 'Time Sensitivity (10%)', key: 'time_sensitivity', val: subScores.time_sensitivity },
              ].map(sub => (
                <div key={sub.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{sub.label}</span>
                    <span className="font-mono text-slate-900 dark:text-slate-100">{sub.val.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-brand-600 h-1.5 rounded-full" style={{ width: `${sub.val * 100}%` }} />
                  </div>
                  {justifications[sub.key] && (
                    <p className="text-[11px] text-slate-400 italic">
                      &bull; {justifications[sub.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actionable Recommendations */}
          {finding.recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Actionable Recommendations</span>
              </h4>
              <div className="space-y-2">
                {finding.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-between space-x-3 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 leading-relaxed">{rec.action}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      rec.effort === 'low' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                      rec.effort === 'medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' :
                      'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                    }`}>
                      {rec.effort} effort
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Questions to Challenge the Team */}
          {finding.questions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-brand-500" />
                <span>Critical Questions to Ask</span>
              </h4>
              <div className="space-y-1.5">
                {finding.questions.map((q, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    &ldquo;{q}&rdquo;
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Triage Status & Operator Notes */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Triage & Audit Action
            </h4>
            
            {/* Status Button Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleStatusChange('open')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  finding.status === 'open'
                    ? 'bg-brand-600 text-white border-brand-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Open
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleStatusChange('accepted')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  finding.status === 'accepted'
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Accept Risk
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleStatusChange('resolved')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  finding.status === 'resolved'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Resolved
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleStatusChange('dismissed')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                  finding.status === 'dismissed'
                    ? 'bg-slate-600 text-white border-slate-700 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Dismiss
              </button>
            </div>

            {/* Note Text Box */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Auditor Note & Mitigation Plan</span>
              </label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Document your team's decision, Jira ticket link, or remediation comment..."
                rows={2}
                className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <div className="flex justify-end">
                <button
                  disabled={isSubmitting || note === (finding.note || '')}
                  onClick={handleSaveNote}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
