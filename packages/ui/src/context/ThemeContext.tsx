import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import type { ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  reduceTransparency: boolean;
  setReduceTransparency: (reduce: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('harbor-theme');
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  const [isDark, setIsDark] = useState(false);
  const [reduceTransparency, setReduceTransparency] = useState(() => localStorage.getItem('harbor-reduce-transparency') === 'true');

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-transparency', reduceTransparency);
    localStorage.setItem('harbor-reduce-transparency', String(reduceTransparency));
  }, [reduceTransparency]);

  useEffect(() => {
    const root = window.document.documentElement;
    let current = true;
    let revision = 0;

    const updateDarkMode = () => {
      let dark = false;
      if (theme === 'dark') {
        dark = true;
      } else if (theme === 'system') {
        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDark(dark);
      root.style.colorScheme = dark ? 'dark' : 'light';
      if ('__TAURI_INTERNALS__' in window) {
        const request = ++revision;
        void getCurrentWindow().setTheme(theme === 'system' ? null : theme)
          .then(() => {
            if (current && request === revision) return invoke('set_window_appearance', { dark });
          })
          .catch(error => console.error('Failed to update window theme:', error));
      }
      if (dark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateDarkMode();
    localStorage.setItem('harbor-theme', theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateDarkMode();
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => { current = false; mediaQuery.removeEventListener('change', handleChange); };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark, reduceTransparency, setReduceTransparency }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
