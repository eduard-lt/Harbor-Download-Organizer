import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { ServiceStatus } from '../lib/tauri';
import {
    getServiceStatus,
    startService,
    stopService,
    triggerOrganizeNow,
    getStartupEnabled,
    setStartupEnabled as setStartupEnabledApi,
    getDownloadDir,
    reloadConfig,
    resetToDefaults
} from '../lib/tauri';

interface SettingsContextType {
    serviceStatus: ServiceStatus;
    startupEnabled: boolean;
    downloadDir: string;
    loading: boolean;
    organizing: boolean;
    error: string | null;
    toggleService: () => Promise<void>;
    toggleStartup: () => Promise<void>;
    organizeNow: () => Promise<number>;
    reload: () => Promise<void>;
    reset: () => Promise<void>;
    refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({ running: false });
    const [startupEnabled, setStartupEnabled] = useState(false);
    const [downloadDir, setDownloadDir] = useState('');
    const [loading, setLoading] = useState(true);
    const [organizing, setOrganizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const [status, startup, dir] = await Promise.all([
                getServiceStatus(),
                getStartupEnabled(),
                getDownloadDir()
            ]);
            setServiceStatus(status);
            setStartupEnabled(startup);
            setDownloadDir(dir);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll service status every 5 seconds to stay in sync with backend
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(() => {
            getServiceStatus().then(setServiceStatus).catch(console.error);
        }, 5000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const toggleService = async () => {
        try {
            // Optimistic update
            const newRunningState = !serviceStatus.running;
            setServiceStatus(prev => ({ ...prev, running: newRunningState }));

            if (serviceStatus.running) {
                await stopService();
            } else {
                await startService();
            }
            // Fetch validation
            const status = await getServiceStatus();
            setServiceStatus(status);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            // Revert on error
            fetchStatus();
        }
    };

    const toggleStartup = async () => {
        try {
            // Optimistic update
            const newState = !startupEnabled;
            setStartupEnabled(newState);

            await setStartupEnabledApi(newState);

            // Validation
            const enabled = await getStartupEnabled();
            setStartupEnabled(enabled);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            fetchStatus();
        }
    };

    const organizeNow = async () => {
        try {
            setOrganizing(true);
            const count = await triggerOrganizeNow();
            return count;
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        } finally {
            setOrganizing(false);
        }
    };

    const reload = async () => {
        try {
            await reloadConfig();
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        }
    };

    const reset = async () => {
        try {
            await resetToDefaults();
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            throw err;
        }
    };

    return (
        <SettingsContext.Provider value={{
            serviceStatus,
            startupEnabled,
            downloadDir,
            loading,
            organizing,
            error,
            toggleService,
            toggleStartup,
            organizeNow,
            reload,
            reset,
            refresh: fetchStatus
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettingsContext must be used within a SettingsProvider');
    }
    return context;
}
