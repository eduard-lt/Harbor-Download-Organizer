import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';
import { UpdateProvider } from './context/UpdateContext';
import { Layout } from './components/Layout';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { RulesPage } from './pages/RulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { InfoPage } from './pages/InfoPage';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useWindowSize } from './hooks/useWindowSize';

function GlobalNavigationListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const unlisten = listen<string>('navigate', (event) => {
      navigate(event.payload);
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [navigate]);

  return null;
}

function GlobalContextMenuListener() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (process.env.NODE_ENV === 'production') {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return null;
}

function App() {
  // Initialize window size persistence
  useWindowSize();

  return (
    <SettingsProvider>
      <ThemeProvider>
        <BrowserRouter>
          <GlobalNavigationListener />
          <GlobalContextMenuListener />
          <UpdateProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<RulesPage />} />
                <Route path="activity" element={<ActivityLogsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="info" element={<InfoPage />} />
              </Route>
            </Routes>
          </UpdateProvider>
        </BrowserRouter>
      </ThemeProvider>
    </SettingsProvider>
  );
}

export default App;
