'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ExportModal from '@/components/ExportModal';
import { getProjectResults } from '@/lib/api';
import { ProjectResults, Finding } from '@/types';
import { formatTier } from '@/lib/utils';
import { CheckSquare, Flame, Clock, Calendar, Check, Sparkles } from 'lucide-react';

interface ActionTask {
  id: string;
  action: string;
  effort: 'low' | 'medium' | 'high';
  findingTitle: string;
  findingTier: string;
  completed: boolean;
}

export default function ActionPlanPage() {
  const params = useParams();
  const projectId = Number(params?.id);

  const [data, setData] = useState<ProjectResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    getProjectResults(projectId)
      .then(res => {
        setData(res);
        // Build tasks from findings recommendations
        const tList: ActionTask[] = [];
        res.findings.forEach(f => {
          f.recommendations.forEach((r, idx) => {
            tList.push({
              id: `${f.id}-${idx}`,
              action: r.action,
              effort: r.effort,
              findingTitle: f.title,
              findingTier: f.tier,
              completed: false,
            });
          });
        });
        setTasks(tList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  // Partition tasks into 3 columns: Do First, Do Next, Do Later
  const { doFirst, doNext, doLater } = useMemo(() => {
    const first: ActionTask[] = [];
    const next: ActionTask[] = [];
    const later: ActionTask[] = [];

    tasks.forEach(t => {
      const isHighRisk = t.findingTier === 'Critical' || t.findingTier === 'High';
      if (isHighRisk && (t.effort === 'low' || t.effort === 'medium')) {
        first.push(t);
      } else if (isHighRisk && t.effort === 'high') {
        next.push(t);
      } else if (t.effort === 'low') {
        next.push(t);
      } else {
        later.push(t);
      }
    });

    return { doFirst: first, doNext: next, doLater: later };
  }, [tasks]);

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar projectId={projectId} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-sm text-slate-400 font-medium">
            Building 3-column action plan...
          </div>
        </div>
      </div>
    );
  }

  const { project, summary } = data;

  const renderColumn = (title: string, subtitle: string, icon: any, colTasks: ActionTask[], badgeColor: string) => {
    const IconComponent = icon;
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col space-y-4">
        {/* Column Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${badgeColor}`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <span className="text-[10px] text-slate-400 block">{subtitle}</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {colTasks.length}
          </span>
        </div>

        {/* Task Cards */}
        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
          {colTasks.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 italic">
              No tasks scheduled for this phase.
            </div>
          ) : (
            colTasks.map(t => {
              const tierStyle = formatTier(t.findingTier);
              return (
                <div
                  key={t.id}
                  onClick={() => toggleTask(t.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 select-none ${
                    t.completed
                      ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-60'
                      : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800/80 hover:border-brand-500/50 shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-2.5">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => toggleTask(t.id)}
                      className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                    />
                    <div className="space-y-1 flex-1">
                      <p
                        className={`text-xs font-medium leading-relaxed ${
                          t.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {t.action}
                      </p>
                      <div className="flex items-center space-x-2 pt-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${tierStyle.badge}`}>
                          {t.findingTier}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          t.effort === 'low' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                          t.effort === 'medium' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                          'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        }`}>
                          {t.effort} effort
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <Navbar
        projectId={projectId}
        projectName={project.name}
        isDemoMode={summary.is_demo_mode}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <CheckSquare className="w-6 h-6 text-brand-600 dark:text-brand-400" />
              <span>Prioritized Action Plan</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Three-phase remediation sequence optimized for rapid risk reduction.
            </p>
          </div>

          {/* Progress Tracker */}
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Progress:</span>
            <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">{completedCount}/{tasks.length} ({progressPct}%)</span>
          </div>
        </div>

        {/* 3-Column Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {renderColumn(
            '1. Do First',
            'High-impact quick wins & critical blockers',
            Flame,
            doFirst,
            'bg-red-500/10 text-red-600'
          )}

          {renderColumn(
            '2. Do Next',
            'Important architectural mitigations',
            Clock,
            doNext,
            'bg-amber-500/10 text-amber-600'
          )}

          {renderColumn(
            '3. Do Later',
            'Long-term improvements & heavy lift items',
            Calendar,
            doLater,
            'bg-indigo-500/10 text-brand-600'
          )}
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
