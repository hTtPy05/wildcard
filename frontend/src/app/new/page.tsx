'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { createProject, uploadArtifact, triggerAnalysis, seedSample } from '@/lib/api';
import { Upload, FileText, Database, GitFork, ArrowRight, Sparkles, Check, AlertCircle, Trash2 } from 'lucide-react';

const DOMAINS = [
  'General',
  'Logistics / Food Delivery',
  'Fintech & Payments',
  'Healthcare & Life Sciences',
  'Education & EdTech',
  'E-Commerce & Supply Chain',
  'Machine Learning & Data Systems',
  'SaaS & Developer Tools',
];

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [domain, setDomain] = useState('Logistics / Food Delivery');
  const [pastedText, setPastedText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selected]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a project title.');
      return;
    }
    if (files.length === 0 && !pastedText.trim()) {
      setErrorMsg('Please upload at least one artifact or paste text to analyze.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Create project
      const project = await createProject(name, goal, domain);

      // 2. Upload pasted text if present
      if (pastedText.trim()) {
        await uploadArtifact(project.id, {
          pastedText: pastedText.trim(),
          name: `${name}_PRD.md`,
          kind: 'document',
        });
      }

      // 3. Upload files
      for (const file of files) {
        await uploadArtifact(project.id, { file });
      }

      // 4. Trigger analysis
      await triggerAnalysis(project.id);

      // 5. Navigate to progress stepper
      router.push(`/project/${project.id}/progress`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to start analysis.');
      setIsSubmitting(false);
    }
  };

  const handleInstantSample = async (sampleKey: string) => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await seedSample(sampleKey);
      router.push(`/project/${res.project_id}/dashboard`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to seed sample project.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
        
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Initiate BlindSpot AI Audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Submit your documents, datasets, or workflow graphs. We identify unstated assumptions, overlooked constraints, and data risks.
          </p>
        </div>

        {/* Quick Sample Cards Strip */}
        <div className="p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/40 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
            <Sparkles className="w-4 h-4 text-brand-500" />
            <span>Or load pre-seeded benchmark test cases with planted gaps:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleInstantSample('startup_prd')}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 text-left transition-all text-xs space-y-1 shadow-sm"
            >
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-500" />
                <span>Startup Campus PRD</span>
              </div>
              <span className="text-[11px] text-slate-500 block truncate">20m SLA vs 2 couriers, ₹2L budget</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleInstantSample('student_performance')}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 text-left transition-all text-xs space-y-1 shadow-sm"
            >
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-500" />
                <span>Student Performance Data</span>
              </div>
              <span className="text-[11px] text-slate-500 block truncate">Leakage, PII, 6% class imbalance</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleInstantSample('order_fulfillment')}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 text-left transition-all text-xs space-y-1 shadow-sm"
            >
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                <GitFork className="w-3.5 h-3.5 text-purple-500" />
                <span>Order Fulfillment Flow</span>
              </div>
              <span className="text-[11px] text-slate-500 block truncate">Unowned node, no payment rollback</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Project Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. QuickBite Campus Food Delivery"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Domain / Industry
              </label>
              <select
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {DOMAINS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Core Stated Goal / Objective
            </label>
            <input
              type="text"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g. Achieve 1,000 orders/day with 20-minute delivery SLA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Upload Artifacts (PDF, DOCX, Markdown, CSV, JSON, YAML)
            </label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleFileDrop}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40 relative"
            >
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.md,.txt,.csv,.xlsx,.xls,.json,.yaml,.yml"
                onChange={handleFileInput}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="space-y-2 flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Click to browse or drag and drop files here
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    PRD documents, CSV datasets (up to 10MB), and workflow DAGs
                  </span>
                </div>
              </div>
            </div>

            {/* Uploaded File List */}
            {files.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Ready to analyze ({files.length}):
                </span>
                <div className="space-y-1.5">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs"
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{f.name}</span>
                        <span className="text-slate-400 font-mono text-[10px]">({Math.round(f.size / 1024)} KB)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(i)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Paste Document Text Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Or Paste PRD / Document Content Directly
            </label>
            <textarea
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder="Paste Markdown, user stories, or requirements text here..."
              rows={4}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAnalyze}
              className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center space-x-2 disabled:opacity-50 transition-all hover:scale-[1.02]"
            >
              <span>{isSubmitting ? 'Starting Pipeline...' : 'Analyze for Blind Spots'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
