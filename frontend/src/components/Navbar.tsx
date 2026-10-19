'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';
import { ShieldAlert, Plus, LayoutDashboard, Search, HelpCircle, CheckSquare, Sparkles } from 'lucide-react';

interface NavbarProps {
  projectId?: number;
  projectName?: string;
  isDemoMode?: boolean;
  onOpenExport?: () => void;
}

export default function Navbar({ projectId, projectName, isDemoMode = false, onOpenExport }: NavbarProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 dark:text-white">
                BlindSpot<span className="text-brand-600 dark:text-brand-400">.ai</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                Evidence-Backed Audit
              </span>
            </div>
          </Link>

          {/* Project Title if in project */}
          {projectName && (
            <div className="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-200 dark:border-slate-800 text-sm">
              <span className="text-slate-400 font-medium">Project:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 max-w-[200px] truncate">
                {projectName}
              </span>
            </div>
          )}
        </div>

        {/* Project Navigation Links */}
        {projectId && (
          <nav className="hidden lg:flex items-center space-x-1">
            <Link
              href={`/project/${projectId}/dashboard`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                pathname?.includes('/dashboard')
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href={`/project/${projectId}/findings`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                pathname?.includes('/findings')
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Findings</span>
            </Link>

            <Link
              href={`/project/${projectId}/questions`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                pathname?.includes('/questions')
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Questions</span>
            </Link>

            <Link
              href={`/project/${projectId}/action-plan`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                pathname?.includes('/action-plan')
                  ? 'bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Action Plan</span>
            </Link>
          </nav>
        )}

        {/* Right Action Icons */}
        <div className="flex items-center space-x-3">
          {/* Demo Mode Badge */}
          {isDemoMode && (
            <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Demo Mode</span>
            </div>
          )}

          {/* Export Button if available */}
          {onOpenExport && (
            <button
              onClick={onOpenExport}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
            >
              Export
            </button>
          )}

          {/* New Analysis button */}
          <Link
            href="/new"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Analysis</span>
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
