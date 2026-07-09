import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';

export function QuitToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unlisten = listen('show-quit-popup', () => {
      setVisible(true);
      // Auto-dismiss after 7 seconds
      setTimeout(() => setVisible(false), 7000);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-xl shadow-2xl border border-slate-600/50 flex items-center gap-3">
        <span className="material-icons-round text-amber-400">warning</span>
        <div>
          <p className="text-sm font-semibold">Press <kbd className="px-1.5 py-0.5 text-xs bg-slate-600 rounded font-mono">⌘Q</kbd> again to fully quit Harbor</p>
          <p className="text-xs text-slate-400 mt-0.5">The app will continue running in the background.</p>
        </div>
      </div>
    </div>
  );
}
