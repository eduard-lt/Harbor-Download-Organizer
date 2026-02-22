import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="min-h-[6rem] py-6 pt-10 flex items-center justify-between px-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex-shrink-0">
      <div className="flex-shrink-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-4">{children}</div>}
    </header>
  );
}
