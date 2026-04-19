import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { OrganizeNowResponse, ServiceStatus } from '../lib/tauri';
import {
    getServiceStatus,
    startService,
    stopService,
    retryServiceRestart,
    triggerOrganizeNow,
    getStartupEnabled,
    setStartupEnabled as setStartupEnabledApi,
    getDownloadDir,
    subscribeServiceStatus,
    subscribeStartupStatus,
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
    retryService: () => Promise<void>;
    toggleStartup: () => Promise<void>;
    organizeNow: () => Promise<OrganizeNowResponse>;
    reload: () => Promise<void>;
    reset: () => Promise<void>;
    refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
        running: false,
        lifecycle_state: 'stopped',
        degraded: false,
        degraded_reason: null,
    });
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

    // Event-first updates with polling fallback for missed/delayed events.
    useEffect(() => {
        let unlistenService: (() => void) | undefined;
        let unlistenStartup: (() => void) | undefined;

        const setupListeners = async () => {
            unlistenService = await subscribeServiceStatus((status) => {
                setServiceStatus(status);
                getServiceStatus().then(setServiceStatus).catch(console.error);
            });

            unlistenStartup = await subscribeStartupStatus((event) => {
                setStartupEnabled(event.enabled);
                getStartupEnabled().then(setStartupEnabled).catch(console.error);
            });
        };

        fetchStatus();
        setupListeners().catch(console.error);

        const interval = setInterval(() => {
            Promise.all([getServiceStatus(), getStartupEnabled()])
                .then(([status, startup]) => {
                    setServiceStatus(status);
                    setStartupEnabled(startup);
                })
                .catch(console.error);
        }, 5000);

        return () => {
            clearInterval(interval);
            unlistenService?.();
            unlistenStartup?.();
        };
    }, [fetchStatus]);

    const toggleService = async () => {
        try {
            if (serviceStatus.running) {
                await stopService();
            } else {
                await startService();
            }
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            await fetchStatus();
        }
    };

    const retryService = async () => {
        try {
            await retryServiceRestart();
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            await fetchStatus();
        }
    };

    const toggleStartup = async () => {
        try {
            const newState = !startupEnabled;
            await setStartupEnabledApi(newState);
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            await fetchStatus();
        }
    };

    const organizeNow = async () => {
        try {
            setOrganizing(true);
            const result = await triggerOrganizeNow();
            return result;
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
            retryService,
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
