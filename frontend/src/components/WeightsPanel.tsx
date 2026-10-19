'use client';

import { useState } from 'react';
import { ReweightPayload } from '@/types';
import { Sliders, RotateCcw, Check, Sparkles } from 'lucide-react';

interface WeightsPanelProps {
  onReweight: (weights: ReweightPayload) => Promise<void>;
  isLoading?: boolean;
}

const DEFAULT_WEIGHTS: ReweightPayload = {
  severity: 0.35,
  likelihood: 0.25,
  breadth: 0.20,
  irreversibility: 0.10,
  time_sensitivity: 0.10,
};

export default function WeightsPanel({ onReweight, isLoading = false }: WeightsPanelProps) {
  const [weights, setWeights] = useState<ReweightPayload>(DEFAULT_WEIGHTS);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSliderChange = (key: keyof ReweightPayload, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  const handleSubmit = async () => {
    await onReweight(weights);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Custom Risk Weights
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tune formula coefficients & re-rank findings live without calling LLM
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center space-x-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sliders */}
      <div className="space-y-3.5">
        {[
          { key: 'severity', label: 'Severity (Business Impact)', desc: 'Financial loss, SLA breach, legal penalty' },
          { key: 'likelihood', label: 'Likelihood (Frequency)', desc: 'Probability of bug or condition triggering' },
          { key: 'breadth', label: 'Breadth (User Exposure)', desc: 'Percentage of users or systems affected' },
          { key: 'irreversibility', label: 'Irreversibility', desc: 'Difficulty or cost of rolling back' },
          { key: 'time_sensitivity', label: 'Time Sensitivity (Urgency)', desc: 'How quickly failure cascades after launch' },
        ].map(({ key, label, desc }) => {
          const val = weights[key as keyof ReweightPayload];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="text-[10px] text-slate-400 block">{desc}</span>
                </div>
                <span className="font-mono font-bold text-brand-600 dark:text-brand-400 w-10 text-right">
                  {(val * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1.0"
                step="0.05"
                value={val}
                onChange={e => handleSliderChange(key as keyof ReweightPayload, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-600"
              />
            </div>
          );
        })}
      </div>

      {/* Apply Button */}
      <button
        disabled={isLoading}
        onClick={handleSubmit}
        className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-all shadow-md shadow-brand-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
      >
        {isSuccess ? (
          <>
            <Check className="w-4 h-4 text-emerald-300" />
            <span>Re-ranked Live!</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Recomputing...' : 'Re-rank Findings Live'}</span>
          </>
        )}
      </button>
    </div>
  );
}
