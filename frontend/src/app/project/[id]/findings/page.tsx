'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FindingCard from '@/components/FindingCard';
import FindingDetailDrawer from '@/components/FindingDetailDrawer';
import WeightsPanel from '@/components/WeightsPanel';
import ExportModal from '@/components/ExportModal';
import { getProjectResults, patchFinding, reweightProject } from '@/lib/api';
import { ProjectResults, Finding, ReweightPayload } from '@/types';
import { formatFindingType } from '@/lib/utils';
import { Filter, Sliders, ArrowUpDown, Search as SearchIcon, ShieldAlert, Sparkles } from 'lucide-react';

export default function FindingsPage() {
  const params = useParams();
  const projectId = Number(params?.id);

  const [data, setData] = useState<ProjectResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReweighting, setIsReweighting] = useState(false);
  const [showWeights, setShowWeights] = useState(false);

  // Filters
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedArtifact, setSelectedArtifact] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'confidence'>('priority');

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
    if (selectedFinding && selectedFinding.id === findingId) {
      setSelectedFinding(prev => prev ? { ...prev, status, note } : null);
    }
  };

  const handleReweight = async (weights: ReweightPayload) => {
    setIsReweighting(true);
    try {
      await reweightProject(projectId, weights);
      await loadData();
    } finally {
      setIsReweighting(false);
    }
  };

  // Filtered & sorted findings
  const filteredFindings = useMemo(() => {
    if (!data) return [];
    return data.findings
      .filter(f => {
        if (selectedTier !== 'all' && f.tier !== selectedTier) return false;
        if (selectedType !== 'all' && f.type !== selectedType) return false;
        if (selectedStatus !== 'all' && f.status !== selectedStatus) return false;
        if (selectedArtifact !== 'all') {
          const match = f.evidence.some(e => String(e.artifact_id) === selectedArtifact);
          if (!match) return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match = f.title.toLowerCase().includes(q) || f.explanation.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'impact') return b.impact - a.impact;
        if (sortBy === 'confidence') return b.confidence - a.confidence;
        return b.priority - a.priority;
      });
  }, [data, selectedTier, selectedType, selectedArtifact, selectedStatus, searchQuery, sortBy]);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar projectId={projectId} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-sm text-slate-400 font-medium">
            Loading findings explorer...
          </div>
        </div>
      </div>
    );
  }

  const { project, artifacts, findings, summary } = data;

  return (
    <div className="min-h-screen flex flex-col pb-16">
      <Navbar
        projectId={projectId}
        projectName={project.name}
        isDemoMode={summary.is_demo_mode}
        onOpenExport={() => setIsExportOpen(true)}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        
        {/* Header & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
              Identified Blind Spots ({filteredFindings.length} of {findings.length})
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Filter by tier, vulnerability type, or adjust risk weights to re-rank live.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowWeights(!showWeights)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-all ${
                showWeights
                  ? 'bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 border-brand-500'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showWeights ? 'Hide Weight Sliders' : 'Tune Risk Weights'}</span>
            </button>
          </div>
        </div>

        {/* Weights Sliders Panel (Collapsible) */}
        {showWeights && (
          <div className="animate-in fade-in duration-200">
            <WeightsPanel onReweight={handleReweight} isLoading={isReweighting} />
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          
          {/* Top row: search + sort */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search findings by keyword..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end text-xs">
              <span className="text-slate-400 flex items-center space-x-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort by:</span>
              </span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="priority">Priority (Impact &times; Conf)</option>
                <option value="impact">Impact Score</option>
                <option value="confidence">Evidence Confidence</option>
              </select>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {/* Tier Filters */}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tier:</span>
            {['all', 'Critical', 'High', 'Medium', 'Low'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedTier === t
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {t === 'all' ? 'All Tiers' : t}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

            {/* Type Filters */}
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Vulnerability Types</option>
              <option value="missing_assumption">Missing Assumptions</option>
              <option value="overlooked_constraint">Overlooked Constraints</option>
              <option value="contradiction">Contradictions</option>
              <option value="data_risk">Data Risks</option>
              <option value="workflow_risk">Workflow Risks</option>
              <option value="unasked_question">Unasked Questions</option>
            </select>

            {/* Artifact Filters */}
            {artifacts.length > 1 && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Artifact:</span>
                <select
                  value={selectedArtifact}
                  onChange={e => setSelectedArtifact(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[180px] truncate"
                >
                  <option value="all">All Artifacts</option>
                  {artifacts.map(a => (
                    <option key={a.id} value={String(a.id)}>{a.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* Findings Grid */}
        {filteredFindings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
            <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <h3 className="font-bold text-sm text-slate-700 dark:text-slate-300">
              No matching blind spots found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your filter chips or search keyword to view other identified project risks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFindings.map(f => (
              <FindingCard
                key={f.id}
                finding={f}
                onClick={() => setSelectedFinding(f)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Detail Drawer */}
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
