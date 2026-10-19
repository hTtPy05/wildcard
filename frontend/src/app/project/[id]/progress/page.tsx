'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getProjectStatus, triggerAnalysis } from '@/lib/api';
import { CheckCircle2, Loader2, AlertCircle, FileSearch, Sparkles, Database, GitFork, ArrowRight } from 'lucide-react';

const STAGES = [
  { id: 'ingest', title: '1. Ingest & Index', desc: 'Preserving character offsets & profiling datasets', minPct: 15 },
  { id: 'extract', title: '2. Extract Model', desc: 'Structuring goals, assumptions, constraints & quotes', minPct: 35 },
  { id: 'detect', title: '3. Dual-Engine Detect', desc: 'Rule analyzers & 10-taxonomy gap reasoning', minPct: 65 },
  { id: 'rank', title: '4. Rank & Recommend', desc: 'Validating tangible evidence & computing impact scores', minPct: 85 },
];

export default function AnalysisProgressPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params?.id);

  const [statusData, setStatusData] = useState<{
    id: number;
    status: string;
    progress_pct: number;
    status_message: string;
    is_demo_mode: boolean;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await getProjectStatus(projectId);
        if (!isMounted) return;
        setStatusData(res);

        if (res.status === 'done') {
          clearInterval(interval);
          setTimeout(() => {
            router.push(`/project/${projectId}/dashboard`);
          }, 800);
        } else if (res.status === 'failed') {
          clearInterval(interval);
          setError(res.status_message || 'Analysis pipeline encountered an error.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Status check failed.');
      }
    }, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [projectId, router]);

  const handleRetry = async () => {
    setError(null);
    try {
      await triggerAnalysis(projectId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const currentPct = statusData?.progress_pct || 10;
  const currentStatusMsg = statusData?.status_message || 'Initializing audit pipeline...';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar projectId={projectId} isDemoMode={statusData?.is_demo_mode} />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-16 w-full flex flex-col justify-center">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Running BlindSpot AI Audit
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Scanning for missing assumptions, unasked questions, and operational gaps backed by evidence.
            </p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-600 dark:text-slate-300">{currentStatusMsg}</span>
              <span className="text-brand-600 dark:text-brand-400 font-mono">{currentPct}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <div
                className="bg-gradient-to-r from-brand-600 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${currentPct}%` }}
              />
            </div>
          </div>

          {/* 4-Stage Stepper */}
          <div className="grid grid-cols-1 gap-3 pt-2">
            {STAGES.map((stage) => {
              const isCompleted = currentPct >= stage.minPct + 15 || statusData?.status === 'done';
              const isCurrent = currentPct >= stage.minPct && !isCompleted;

              return (
                <div
                  key={stage.id}
                  className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                    isCompleted
                      ? 'border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200'
                      : isCurrent
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/30 text-slate-900 dark:text-white ring-2 ring-brand-500/20'
                      : 'border-slate-200 dark:border-slate-800 opacity-50 bg-slate-50 dark:bg-slate-950 text-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : isCurrent ? (
                        <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />
                      ) : (
                        <span className="text-slate-400">&bull;</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm">{stage.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{stage.desc}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono font-semibold">
                    {isCompleted ? 'Complete' : isCurrent ? 'Active' : 'Queued'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 space-y-3">
              <div className="flex items-center space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
                >
                  Retry Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
