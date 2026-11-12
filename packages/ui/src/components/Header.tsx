import type { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  /** Short factual context beside the title, such as a count. */
  subtitle?: string;
  children?: ReactNode;
}

export function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <header className="page-head">
      <div className="page-title">
        <h1>{title}</h1>
        {subtitle && <span className="count">{subtitle}</span>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </header>
  );
}
