import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="harbor-page-header">
      <div className="flex-shrink-0">
        <h1>{title}</h1>
        {subtitle && (
          <p className="harbor-page-subtitle">{subtitle}</p>
        )}
      </div>
      {children && <div className="harbor-header-actions">{children}</div>}
    </header>
  );
}
