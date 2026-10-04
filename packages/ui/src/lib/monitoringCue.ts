import { useSyncExternalStore } from 'react';

const key = 'harbor-monitoring-cue';
const event = 'harbor-monitoring-cue-change';

export function setMonitoringCue(pending: boolean) {
  localStorage.setItem(key, String(pending));
  window.dispatchEvent(new Event(event));
}

function subscribe(notify: () => void) {
  window.addEventListener(event, notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener(event, notify);
    window.removeEventListener('storage', notify);
  };
}

export function useMonitoringCue() {
  return useSyncExternalStore(subscribe, () => localStorage.getItem(key) === 'true');
}
