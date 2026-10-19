'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { seedSample } from '@/lib/api';
import { ShieldAlert, ArrowRight, Sparkles, FileText, Database, GitFork, CheckCircle, BarChart3, AlertTriangle, Layers } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [loadingSample, setLoadingSample] = useState<string | null>(null);

  const handleLaunchSample = async (sampleKey: string) => {
    setLoadingSample(sampleKey);
    try {
      const res = await seedSample(sampleKey);
      router.push(`/project/${res.project_id}/dashboard`);
    } catch (err) {
      alert(`Failed to load sample: ${err}`);
      setLoadingSample(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/10 dark:bg-brand-600/15 blur-[120px] rounded-full pointer-events-none" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
            
            {/* Pill Banner */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-brand-500/30 bg-brand-50/50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-300 text-xs font-semibold shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Zero Hallucinations &bull; 100% Verifiable Evidence Guarantee</span>
            </div>

            {/* Bold Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Uncover What Your Team <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-indigo-500 to-amber-500">
                Has Not Considered.
              </span>
            </h1>

            {/* One-Sentence Value Statement */}
            <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              BlindSpot AI audits project PRDs, datasets, and operational workflows to identify missing assumptions, overlooked constraints, and unasked questions—with every single finding backed by clickable text spans, statistics, or graph nodes.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/new"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
              >
                <span>Start New Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={() => handleLaunchSample('startup_prd')}
                disabled={loadingSample !== null}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm transition-all"
              >
                {loadingSample === 'startup_prd' ? 'Loading Sample...' : 'Try a Sample Project'}
              </button>
            </div>
          </div>
        </section>

        {/* Instant Sample Cards Showcase */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8 space-y-2">
            <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400">
              Interactive Test Suites
            </h2>
            <p className="text-xl font-bold text-slate-900 dark:text-white">
              Explore Realistic Projects with Planted Vulnerabilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sample 1: Startup PRD */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Product Requirements Document
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    QuickBite Campus Delivery
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  20-min delivery SLA vs 2 couriers for 1,000 orders/day, ₹2L budget vs paid Google Maps API, background GPS privacy leaks, and zero refund handling.
                </p>
              </div>

              <button
                onClick={() => handleLaunchSample('startup_prd')}
                disabled={loadingSample !== null}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
              >
                <span>{loadingSample === 'startup_prd' ? 'Loading...' : 'Launch PRD Audit'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sample 2: Student Performance Dataset */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Tabular Dataset (1,500 Rows)
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Student Academic Risk Model
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Direct target label leakage, plain-text student email PII, severe 6% class imbalance, 25% missing attendance records, and single-semester cohort bias.
                </p>
              </div>

              <button
                onClick={() => handleLaunchSample('student_performance')}
                disabled={loadingSample !== null}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
              >
                <span>{loadingSample === 'student_performance' ? 'Loading...' : 'Launch Data Audit'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sample 3: Order Fulfillment Workflow */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-brand-500/50 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                  <GitFork className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Workflow Pipeline (9 Nodes)
                  </span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    E-Commerce Fulfillment Flow
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Unowned pick list generation node, missing rollback on payment failure, single warehouse operator owning pack & dispatch, and irreversible trailer loading without approval.
                </p>
              </div>

              <button
                onClick={() => handleLaunchSample('order_fulfillment')}
                disabled={loadingSample !== null}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:opacity-90 text-white dark:text-slate-900 text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
              >
                <span>{loadingSample === 'order_fulfillment' ? 'Loading...' : 'Launch Workflow Audit'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Three-Step How It Works Strip */}
        <section className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-xs uppercase font-bold tracking-widest text-brand-600 dark:text-brand-400">
                Methodology
              </h2>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white">
                How BlindSpot AI Enforces Rigor
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-extrabold text-lg">
                  01
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Ingest & Offset Preservation
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Parses PDFs, DOCX, Markdown, CSVs, and workflow graphs while cataloging character offsets. Every piece of raw context is indexed so future findings can pinpoint exact source lines.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-extrabold text-lg">
                  02
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Dual-Engine Detection
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Runs deterministic Pandas and NetworkX rule analyzers in parallel with Gemini gap reasoning guided by 10 domain taxonomies (security, compliance, scale, adoption, failure recovery).
                </p>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-extrabold text-lg">
                  03
                </div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Ranked Evidence Action Plan
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Calculates impact and confidence scores, prunes un-evidenced advice, and synthesizes an ordered 3-column Kanban action plan with downloadable executive PDF and Markdown reports.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p>&copy; 2026 BlindSpot AI &bull; Built for Hackathon Presentation</p>
      </footer>
    </div>
  );
}
