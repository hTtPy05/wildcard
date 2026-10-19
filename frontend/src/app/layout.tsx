import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BlindSpot AI — Evidence-Backed Project Risk & Assumption Audit',
  description: 'Audits PRDs, datasets, and workflows to uncover missing assumptions, overlooked constraints, and unasked questions backed strictly by verifiable evidence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
