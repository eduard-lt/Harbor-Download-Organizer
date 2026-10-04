import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [pathname]);
  return (
    <div className="harbor-shell">
      <Sidebar />
      <main ref={mainRef} id="main-content" className="harbor-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
