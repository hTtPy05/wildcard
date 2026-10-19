'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BlindSpotMap from '@/components/BlindSpotMap';
import FindingCard from '@/components/FindingCard';
import FindingDetailDrawer from '@/components/FindingDetailDrawer';
import ExportModal from '@/components/ExportModal';
import { getProjectResults, patchFinding } from '@/lib/api';
import { ProjectResults, Finding } from '@/types';
import { formatTier, formatFindingType } from '@/lib/utils';
import { 
  ShieldAlert, AlertTriangle, AlertCircle, CheckCircle, 
  Layers, ArrowRight, Download, BarChart2, PieChart as PieIcon, 
  HelpCircle, Sparkles, Filter 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ZAxis 
} from 'recharts';

const TYPE_COLORS: Record<string, string> = {
  missing_assumption: '#6366F1',     // Indigo
  overlooked_constraint: '#F59E0B',  // Amber
  contradiction: '#EF4444',          // Red
  data_risk: '#10B981',              // Emerald
  workflow_risk: '#8B5CF6',          // Purple
  unasked_question: '#06B6D4',       // Cyan
};

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params?.id);

  const [data, setData] = useState<ProjectResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      const res = await getProjectResults(projectId);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleUpdateFindingStatus = async (
    findingId: number,
    status: 'open' | 'accepted' | 'dismissed' | 'resolved',
    note?: string
  ) => {
    await patchFinding(findingId, { status, note });
    await loadData();
    // Update local selected finding
    if (selectedFinding && selectedFinding.id === findingId) {
      setSelectedFinding(prev => prev ? { ...prev, status, note } : null);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar projectId={projectId} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-sm text-slate-400 font-medium">
            Loading project insights...
          </div>
        </div>
      </div>
    );
  }

  const { project, artifacts, findings, summary } = data;

  // Donut chart data
  const donutData = Object.entries(summary.type_counts || {}).map(([type, count]) => ({
    name: formatFindingType(type),
    rawType: type,
    value: count,
  }));

  // Scatter chart data (Impact vs Confidence)
  const scatterData = findings.map(f => ({
    id: f.id,
    title: f.title,
    impact: f.impact,
    confidence: Math.round(f.confidence * 100),
    tier: f.tier,
    type: formatFindingType(f.type),
  }));

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <Navbar
        projectId={projectId}
        projectName={project.name}
        isDemoMode={summary.is_demo_mode}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
        
        {/* Project Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {project.name}
              </h1>
              {summary.is_demo_mode && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Demo Mode
                </span>
              )}
            </div>
            {project.goal && (
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
                Objective: &ldquo;{project.goal}&rdquo; &bull; {project.domain || 'General'}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push(`/project/${projectId}/findings`)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity flex items-center space-x-1.5"
            >
              <span>Explore All {findings.length} Findings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 1. Summary Severity Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* Total Findings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Blind Spots
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {summary.total_findings}
            </div>
            <span className="text-[10px] text-slate-400 block">Across {artifacts.length} artifacts</span>
          </div>

          {/* Critical */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-red-500/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
              Critical (&ge;75)
            </span>
            <div className="text-3xl font-extrabold text-red-600 dark:text-red-400">
              {summary.critical_count}
            </div>
            <span className="text-[10px] text-slate-400 block">Immediate launch blocker</span>
          </div>

          {/* High */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-orange-500/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              High (55-74)
            </span>
            <div className="text-3xl font-extrabold text-orange-600 dark:text-orange-400">
              {summary.high_count}
            </div>
            <span className="text-[10px] text-slate-400 block">Major systemic risk</span>
          </div>

          {/* Medium */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-500/20 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Medium (35-54)
            </span>
            <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.medium_count}
            </div>
            <span className="text-[10px] text-slate-400 block">Data/scale deficiency</span>
          </div>

          {/* Low */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Low (&lt;35)
            </span>
            <div className="text-3xl font-extrabold text-slate-600 dark:text-slate-400">
              {summary.low_count}
            </div>
            <span className="text-[10px] text-slate-400 block">Minor operational note</span>
          </div>
        </div>

        {/* 2. Visual Analytics Strip: Donut Chart & Scatter Plot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Donut Chart: Findings by Type */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Blind Spots by Vulnerability Type
                </h3>
                <p className="text-xs text-slate-400">Distribution across categories</p>
              </div>
              <PieIcon className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={TYPE_COLORS[entry.rawType] || '#6366F1'}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {donutData.map(d => (
                <div key={d.rawType} className="flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TYPE_COLORS[d.rawType] || '#6366F1' }}
                  />
                  <span className="text-slate-600 dark:text-slate-400 truncate">{d.name}:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scatter Plot: Impact vs Confidence */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Impact vs. Evidence Confidence
                </h3>
                <p className="text-xs text-slate-400">High Impact + High Confidence = Priority 1 Actions</p>
              </div>
              <BarChart2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    type="number"
                    dataKey="impact"
                    name="Impact"
                    domain={[0, 100]}
                    unit=""
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Impact Score (0-100)', position: 'insideBottom', offset: -10, fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="confidence"
                    name="Confidence"
                    domain={[0, 100]}
                    unit="%"
                    fontSize={11}
                    tickLine={false}
                    label={{ value: 'Confidence %', angle: -90, position: 'insideLeft', fontSize: 10 }}
                  />
                  <ZAxis range={[60, 60]} />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ payload }) => {
                      if (!payload || payload.length === 0) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-2.5 rounded-xl border border-slate-800 text-xs shadow-xl space-y-1 max-w-xs">
                          <span className="font-bold block truncate">{item.title}</span>
                          <div className="text-[11px] text-slate-400">
                            Impact: <b className="text-white">{item.impact}</b> &bull; Conf: <b className="text-white">{item.confidence}%</b>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={scatterData}
                    fill="#6366F1"
                    onClick={(node) => {
                      const match = findings.find(f => f.id === node.id);
                      if (match) setSelectedFinding(match);
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Points in top-right represent high-confidence critical vulnerabilities</span>
              <span className="font-semibold text-brand-600">Click dot to inspect</span>
            </div>
          </div>
        </div>

        {/* 3. The Blind-Spot Map: Matrix Heat Grid */}
        <BlindSpotMap
          findings={findings}
          artifacts={artifacts}
          onSelectCell={(cat, artId) => {
            // Jump to findings filtered
            router.push(`/project/${projectId}/findings`);
          }}
        />

        {/* 4. Top 5 Ranked Risks */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Top Priority Blind Spots
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ranked by potential damage and backed by verifiable quotes or statistics.
              </p>
            </div>
            <button
              onClick={() => router.push(`/project/${projectId}/findings`)}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              View all ({findings.length}) &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {findings.slice(0, 5).map(f => (
              <FindingCard
                key={f.id}
                finding={f}
                onClick={() => setSelectedFinding(f)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Finding Detail Drawer */}
      <FindingDetailDrawer
        finding={selectedFinding}
        artifacts={artifacts}
        onClose={() => setSelectedFinding(null)}
        onUpdateStatus={handleUpdateFindingStatus}
      />

      {/* Export Modal */}
      <ExportModal
        projectId={projectId}
        projectName={project.name}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
