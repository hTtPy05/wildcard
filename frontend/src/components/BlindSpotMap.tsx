'use client';

import React from 'react';
import { Finding, Artifact } from '@/types';

interface BlindSpotMapProps {
  findings: Finding[];
  artifacts: Artifact[];
  onSelectCell?: (category: string, artifactId?: number) => void;
}

const CATEGORIES = [
  { id: 'security', name: 'Security & Privacy', keywords: ['privacy', 'security', 'pii', 'consent', 'email', 'tracking', 'telemetry'] },
  { id: 'legal', name: 'Legal & Compliance', keywords: ['legal', 'compliance', 'refund', 'terms', 'cancellation', 'ferpa', 'gdpr'] },
  { id: 'budget', name: 'Budget & Timeline', keywords: ['budget', 'timeline', 'cost', 'runway', 'lakh', 'rupees', 'api rates'] },
  { id: 'scale', name: 'Scalability & Capacity', keywords: ['scale', 'capacity', 'sla', 'courier', 'fleet', 'throughput', 'orders', 'rush'] },
  { id: 'data', name: 'Data Quality & Bias', keywords: ['leakage', 'imbalance', 'missing', 'data_risk', 'attendance', 'cohort', 'temporal'] },
  { id: 'adoption', name: 'User Adoption', keywords: ['adoption', 'smartphone', 'internet', 'connectivity', 'wifi', 'cellular'] },
  { id: 'vendors', name: 'Dependencies & Vendors', keywords: ['vendor', 'dependency', 'google maps', 'gateway', 'third-party', 'api'] },
  { id: 'ethics', name: 'Ethics & Fairness', keywords: ['ethics', 'fairness', 'welfare', 'pressure', 'punitive', 'disadvantaged'] },
  { id: 'operations', name: 'Operations & Maintenance', keywords: ['operations', 'maintenance', 'support', 'packing', 'dispatch', 'workflow_risk', 'unowned'] },
  { id: 'recovery', name: 'Failure & Recovery', keywords: ['failure', 'recovery', 'rollback', 'timeout', 'cycle', 'loop', 'decline'] },
];

export default function BlindSpotMap({ findings, artifacts, onSelectCell }: BlindSpotMapProps) {
  // Compute max impact and finding counts for each cell (category x artifact)
  const cellData = React.useMemo(() => {
    const grid: Record<string, Record<number, { maxImpact: number; count: number; topFinding?: Finding }>> = {};

    CATEGORIES.forEach(cat => {
      grid[cat.id] = {};
      artifacts.forEach(art => {
        grid[cat.id][art.id] = { maxImpact: 0, count: 0 };
      });
    });

    findings.forEach(f => {
      // Find category match
      const fullText = (f.title + ' ' + f.explanation + ' ' + f.type).toLowerCase();
      let matchedCat = CATEGORIES.find(c => c.keywords.some(k => fullText.includes(k))) || CATEGORIES[8]; // default to operations

      // Find artifact match from evidence
      const artId = f.evidence[0]?.artifact_id || artifacts[0]?.id;

      if (matchedCat && artId && grid[matchedCat.id]?.[artId]) {
        const cell = grid[matchedCat.id][artId];
        cell.count += 1;
        if (f.impact > cell.maxImpact) {
          cell.maxImpact = f.impact;
          cell.topFinding = f;
        }
      }
    });

    return grid;
  }, [findings, artifacts]);

  const getCellColor = (maxImpact: number, count: number) => {
    if (count === 0 || maxImpact === 0) {
      return 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800/80';
    }
    if (maxImpact >= 75) {
      return 'bg-red-500 text-white font-bold shadow-sm shadow-red-500/20 border-red-600';
    }
    if (maxImpact >= 55) {
      return 'bg-orange-500 text-white font-bold shadow-sm shadow-orange-500/20 border-orange-600';
    }
    if (maxImpact >= 35) {
      return 'bg-amber-400 text-amber-950 font-bold border-amber-500';
    }
    return 'bg-slate-400 text-white font-medium border-slate-500';
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
            The Blind-Spot Map
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Heat grid of domain taxonomies cross-referenced against artifacts, colored by maximum impact.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span>Critical (&ge;75)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
            <span>High (55-74)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
            <span>Med (35-54)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700" />
            <span>Clear</span>
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr>
              <th className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 w-48">
                Taxonomy Category
              </th>
              {artifacts.map(a => (
                <th
                  key={a.id}
                  className="py-2.5 px-3 font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-center truncate max-w-[160px]"
                >
                  <span className="truncate block" title={a.name}>{a.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal uppercase">({a.kind})</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {CATEGORIES.map(cat => (
              <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                  {cat.name}
                </td>
                {artifacts.map(art => {
                  const data = cellData[cat.id]?.[art.id] || { maxImpact: 0, count: 0 };
                  const colorClass = getCellColor(data.maxImpact, data.count);

                  return (
                    <td key={art.id} className="p-1.5 text-center">
                      <div
                        onClick={() => onSelectCell && onSelectCell(cat.id, art.id)}
                        className={`py-2 px-3 rounded-lg border text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${colorClass} ${
                          data.count > 0 ? 'hover:scale-105 hover:ring-2 hover:ring-brand-500/50' : 'opacity-60'
                        }`}
                        title={data.topFinding ? `${data.count} finding(s) — Top: ${data.topFinding.title} (Impact: ${data.maxImpact})` : 'No blind spots flagged'}
                      >
                        {data.count > 0 ? (
                          <>
                            <span className="text-sm font-bold">{data.maxImpact}</span>
                            <span className="text-[9px] opacity-90">{data.count} risk{data.count > 1 ? 's' : ''}</span>
                          </>
                        ) : (
                          <span className="text-[10px] opacity-40">&mdash;</span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
