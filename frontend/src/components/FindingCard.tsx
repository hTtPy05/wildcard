'use client';

import { Finding } from '@/types';
import { formatTier, formatFindingType } from '@/lib/utils';
import { ArrowRight, CheckCircle2, XCircle, Clock, ShieldAlert, Sparkles, FileText, Database, GitFork } from 'lucide-react';

interface FindingCardProps {
  finding: Finding;
  onClick: () => void;
  onStatusChange?: (status: 'accepted' | 'dismissed' | 'resolved') => void;
}

export default function FindingCard({ finding, onClick, onStatusChange }: FindingCardProps) {
  const tierStyle = formatTier(finding.tier);

  return (
    <div
      onClick={onClick}
      className="group relative bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-500/50 transition-all cursor-pointer flex flex-col justify-between space-y-4"
    >
      {/* Top Header: Tier Badge & Type & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {/* Tier Badge */}
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${tierStyle.badge}`}
          >
            {finding.tier}
          </span>

          {/* Finding Type */}
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {formatFindingType(finding.type)}
          </span>
        </div>

        {/* Status Pill if not open */}
        {finding.status !== 'open' && (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {finding.status}
          </span>
        )}
      </div>

      {/* Main Title and Brief Explanation */}
      <div className="space-y-1.5">
        <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug">
          {finding.title}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {finding.explanation}
        </p>
      </div>

      {/* Evidence Citations Summary */}
      <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-950/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
        <div className="flex items-center space-x-1">
          {finding.evidence[0]?.kind === 'text_span' && <FileText className="w-3.5 h-3.5 text-brand-500" />}
          {finding.evidence[0]?.kind === 'column_stat' && <Database className="w-3.5 h-3.5 text-brand-500" />}
          {finding.evidence[0]?.kind === 'node' && <GitFork className="w-3.5 h-3.5 text-brand-500" />}
          <span className="truncate max-w-[220px]">
            {finding.evidence[0]?.locator || 'Verbatim citation'}
          </span>
        </div>
        {finding.evidence.length > 1 && (
          <span className="text-[10px] text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-1.5 py-0.5 rounded">
            +{finding.evidence.length - 1} more
          </span>
        )}
      </div>

      {/* Bottom Metrics Bar: Impact & Confidence & Priority */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        {/* Impact Bar */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400 text-[11px]">Impact:</span>
          <div className="w-16 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${tierStyle.bar}`}
              style={{ width: `${Math.min(100, finding.impact)}%` }}
            />
          </div>
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {finding.impact}
          </span>
        </div>

        {/* Confidence & Priority */}
        <div className="flex items-center space-x-3 text-slate-500 dark:text-slate-400">
          <span title="Evidence Directness & Consistency">
            Conf: <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.round(finding.confidence * 100)}%</span>
          </span>
          <span className="font-semibold text-brand-600 dark:text-brand-400">
            P:{finding.priority}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
}
