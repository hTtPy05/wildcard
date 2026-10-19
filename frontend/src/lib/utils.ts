import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTier(tier: string) {
  switch (tier.toLowerCase()) {
    case 'critical':
      return {
        badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
        text: 'text-red-600 dark:text-red-400',
        bar: 'bg-red-500',
        dot: 'bg-red-500',
      };
    case 'high':
      return {
        badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
        text: 'text-orange-600 dark:text-orange-400',
        bar: 'bg-orange-500',
        dot: 'bg-orange-500',
      };
    case 'medium':
      return {
        badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        text: 'text-amber-600 dark:text-amber-400',
        bar: 'bg-amber-500',
        dot: 'bg-amber-500',
      };
    case 'low':
    default:
      return {
        badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
        text: 'text-slate-600 dark:text-slate-400',
        bar: 'bg-slate-400',
        dot: 'bg-slate-400',
      };
  }
}

export function formatFindingType(type: string) {
  switch (type) {
    case 'missing_assumption':
      return 'Missing Assumption';
    case 'overlooked_constraint':
      return 'Overlooked Constraint';
    case 'unasked_question':
      return 'Unasked Question';
    case 'contradiction':
      return 'Contradiction';
    case 'data_risk':
      return 'Data Risk';
    case 'workflow_risk':
      return 'Workflow Risk';
    default:
      return type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
