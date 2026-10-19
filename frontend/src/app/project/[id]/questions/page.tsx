'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ExportModal from '@/components/ExportModal';
import { getProjectResults } from '@/lib/api';
import { ProjectResults, Finding } from '@/types';
import { formatFindingType } from '@/lib/utils';
import { HelpCircle, Copy, Check, MessageSquare, ShieldAlert, ArrowRight } from 'lucide-react';

export default function QuestionsPage() {
  const params = useParams();
  const projectId = Number(params?.id);

  const [data, setData] = useState<ProjectResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getProjectResults(projectId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  // Group questions by theme / finding type
  const groupedQuestions = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, { findingTitle: string; findingType: string; questions: string[] }[]> = {};

    data.findings.forEach(f => {
      if (f.questions && f.questions.length > 0) {
        const theme = formatFindingType(f.type);
        if (!groups[theme]) {
          groups[theme] = [];
        }
        groups[theme].push({
          findingTitle: f.title,
          findingType: f.type,
          questions: f.questions,
        });
      }
    });

    return groups;
  }, [data]);

  const allQuestionsCount = useMemo(() => {
    if (!data) return 0;
    return data.findings.reduce((acc, f) => acc + (f.questions?.length || 0), 0);
  }, [data]);

  const handleCopyAll = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`# Questions to Challenge the Team: ${data.project.name}\n`);

    Object.entries(groupedQuestions).forEach(([theme, items]) => {
      lines.push(`## ${theme}`);
      items.forEach(item => {
        lines.push(`\n### Regarding: ${item.findingTitle}`);
        item.questions.forEach(q => {
          lines.push(`- [ ] ${q}`);
        });
      });
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar projectId={projectId} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-sm text-slate-400 font-medium">
            Loading critical questions...
          </div>
        </div>
      </div>
    );
  }

  const { project, summary } = data;

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <Navbar
        projectId={projectId}
        projectName={project.name}
        isDemoMode={summary.is_demo_mode}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <HelpCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <span>Questions to Ask the Team ({allQuestionsCount})</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Incisive inquiries to challenge architects and founders during design reviews or hackathon judging.
            </p>
          </div>

          <button
            onClick={handleCopyAll}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center space-x-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied All Markdown!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy All Questions</span>
              </>
            )}
          </button>
        </div>

        {/* Grouped Questions Accordion/List */}
        <div className="space-y-6">
          {Object.entries(groupedQuestions).map(([theme, items]) => (
            <div key={theme} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Theme: {theme}
                </h3>
              </div>

              <div className="space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">
                      Triggered by: &ldquo;{item.findingTitle}&rdquo;
                    </span>
                    <div className="space-y-1.5 pl-3 border-l-2 border-brand-500/30">
                      {item.questions.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed flex items-start space-x-2"
                        >
                          <span className="text-brand-600 font-bold">&bull;</span>
                          <span>&ldquo;{q}&rdquo;</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <ExportModal
        projectId={projectId}
        projectName={project.name}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
