'use client';

import { getExportUrl } from '@/lib/api';
import { X, FileText, Download, Code, FileCode } from 'lucide-react';

interface ExportModalProps {
  projectId: number;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ projectId, projectName, isOpen, onClose }: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Export Audit Findings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Download clean reports for executive presentation & sprint planning.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          {/* PDF Report */}
          <a
            href={getExportUrl(projectId, 'pdf')}
            download
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center font-bold text-sm">
                PDF
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Executive PDF Report
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ReportLab formatted table with severity scores & citations
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </a>

          {/* Markdown Report */}
          <a
            href={getExportUrl(projectId, 'md')}
            download
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-brand-600 flex items-center justify-center font-bold text-sm">
                MD
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Markdown Document
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  GitHub-ready Markdown format with tables and action checklists
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </a>

          {/* JSON Data */}
          <a
            href={getExportUrl(projectId, 'json')}
            download
            className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 group transition-all"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                JSON
              </div>
              <div>
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Raw JSON Payload
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Complete structured data with character offsets and sub-scores
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-600 transition-colors" />
          </a>
        </div>
      </div>
    </div>
  );
}
