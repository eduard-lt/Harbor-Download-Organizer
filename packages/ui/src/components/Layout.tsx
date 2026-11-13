import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { useSettings } from '../hooks/useSettings';

/**
 * The shoreline behind the glass carries monitoring state: the water is in while
 * Harbor watches; while paused the tide draws back and sunlit sand widens, still in colour.
 */
function Shoreline() {
  return (
    <div className="shore" aria-hidden="true">
      <i className="f-sand" />
      <i className="f-foam" />
      <i className="f-shallows" />
      <i className="f-sea" />
      <i className="f-deep" />
      <i className="f-bay" />
    </div>
  );
}

export function Layout() {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const { serviceStatus, loading } = useSettings();
  // The first known state appears without a transition; later changes ease.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (loading || settled) return;
    const frame = requestAnimationFrame(() => setSettled(true));
    return () => cancelAnimationFrame(frame);
  }, [loading, settled]);

  useEffect(() => {
    mainRef.current?.querySelectorAll('.page-body').forEach(el => { el.scrollTop = 0; });
  }, [pathname]);

  return (
    <div className="shell" data-tide={serviceStatus.running ? 'in' : 'out'} data-settling={settled ? undefined : ''}>
      <Shoreline />
      <div className="frame">
        <TopBar />
        <main ref={mainRef} id="main-content" className="sheet" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
