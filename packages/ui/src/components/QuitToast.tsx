import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Info } from 'lucide-react';

export function QuitToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unlisten = listen('show-quit-popup', () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 7000);
    });

    return () => {
      clearTimeout(timer);
      unlisten.then((f) => f());
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="toasts toast-center">
      <div className="toast" role="status">
        <Info size={16} aria-hidden="true" />
        <div className="grow">
          <div>Press <kbd>⌘Q</kbd> again to quit Harbor</div>
          <div className="sub">Until then, Harbor keeps running in the menu bar.</div>
        </div>
      </div>
    </div>
  );
}
