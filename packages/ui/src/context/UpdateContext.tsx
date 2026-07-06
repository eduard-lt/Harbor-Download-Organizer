import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import packageJson from '../../package.json';
import { getCheckUpdates, setCheckUpdates, getLastNotifiedVersion, setLastNotifiedVersion, notifyUpdateAvailable, dismissUpdateAvailable } from '../lib/tauri';

const GITHUB_REPO = 'eduard-lt/Harbor-Download-Organizer';

/** Delay before first automatic check to ensure the app is fully initialized. */
const INITIAL_CHECK_DELAY_MS = 5_000;
/** Interval between automatic checks. */
const CHECK_INTERVAL_MS = 1000 * 60 * 60 * 3; // 3 hours

interface UpdateState {
    available: boolean;
    hasUpdate: boolean;
    version: string | null;
    url: string | null;
    loading: boolean;
    error: string | null;
    checked: boolean;
}

interface UpdateContextType {
    checkForUpdates: boolean;
    setCheckForUpdates: (value: boolean) => void;
    lastNotifiedVersion: string | null;
    checkNow: () => Promise<void>;
    dismissNotification: () => void;
    updateState: UpdateState;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export function UpdateProvider({ children }: { children: ReactNode }) {
    const [checkForUpdates, setCheckForUpdatesState] = useState<boolean>(true);
    const [lastNotifiedVersion, setLastNotifiedVersionState] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);

    // Ref to always have the latest lastNotifiedVersion without triggering effect re-runs.
    const lastNotifiedRef = useRef<string | null>(null);

    const [updateState, setUpdateState] = useState<UpdateState>({
        available: false,
        hasUpdate: false,
        version: null,
        url: null,
        loading: false,
        error: null,
        checked: false
    });

    // Keep ref in sync with state.
    useEffect(() => {
        lastNotifiedRef.current = lastNotifiedVersion;
    }, [lastNotifiedVersion]);

    // Load settings from backend on mount
    useEffect(() => {
        const loadSettings = async () => {
            setUpdateState(prev => ({ ...prev, loading: true }));
            try {
                const [enabled, version] = await Promise.all([
                    getCheckUpdates(),
                    getLastNotifiedVersion()
                ]);
                setCheckForUpdatesState(enabled);
                setLastNotifiedVersionState(version);
                setIsLoaded(true);
                setUpdateState(prev => ({ ...prev, loading: false }));
            } catch (error) {
                console.error('[Harbor] Failed to load update settings:', error);
                setIsLoaded(true);
                setUpdateState(prev => ({ ...prev, loading: false }));
            }
        };
        loadSettings();
    }, []);

    const setCheckForUpdates = useCallback(async (value: boolean) => {
        setCheckForUpdatesState(value);
        try {
            await setCheckUpdates(value);
        } catch (error) {
            console.error('[Harbor] Failed to save check updates setting:', error);
        }
    }, []);

    const updateLastNotifiedVersion = useCallback(async (version: string) => {
        setLastNotifiedVersionState(version);
        lastNotifiedRef.current = version;
        try {
            await setLastNotifiedVersion(version);
        } catch (error) {
            console.error('[Harbor] Failed to save last notified version:', error);
        }
    }, []);

    const compareVersions = (v1: string, v2: string) => {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    };

    const checkNow = useCallback(async () => {
        setUpdateState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            if (!response.ok) throw new Error('Failed to fetch release info');

            const data = await response.json();
            const latestVersion = data.tag_name.replace(/^v/, '');
            const currentVersion = packageJson.version;

            const hasNewUpdate = compareVersions(latestVersion, currentVersion) > 0;

            setUpdateState({
                available: hasNewUpdate,
                hasUpdate: hasNewUpdate,
                version: latestVersion,
                url: data.html_url,
                loading: false,
                error: null,
                checked: true
            });

        } catch (error) {
            console.error('[Harbor] Update check failed:', error);
            setUpdateState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                checked: true
            }));
        }
    }, []);

    /** Send a system notification and update tray tooltip via the Rust backend. */
    const tryNotify = useCallback(async (latestVersion: string, downloadUrl: string) => {
        try {
            await notifyUpdateAvailable(latestVersion, downloadUrl);
        } catch (e) {
            console.error('[Harbor] Failed to send update notification:', e);
        }

        // Always persist that we've notified for this version so we don't spam.
        updateLastNotifiedVersion(latestVersion);
    }, [updateLastNotifiedVersion]);

    /** Internal check that always mirrors the result into state. */
    const performAutoCheck = useCallback(async () => {
        setUpdateState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            if (!response.ok) throw new Error('Failed to fetch release info');

            const data = await response.json();
            const latestVersion = data.tag_name.replace(/^v/, '');
            const currentVersion = packageJson.version;

            const hasNewUpdate = compareVersions(latestVersion, currentVersion) > 0;

            setUpdateState({
                available: hasNewUpdate,
                hasUpdate: hasNewUpdate,
                version: latestVersion,
                url: data.html_url,
                loading: false,
                error: null,
                checked: true
            });

            if (hasNewUpdate) {
                // Use ref to avoid stale closure and prevent effect re-triggering.
                if (lastNotifiedRef.current !== latestVersion) {
                    // Fire-and-forget notification — don't let it block state update.
                    tryNotify(latestVersion, data.html_url);
                }
            }
        } catch (e) {
            console.error('[Harbor] Auto update check failed:', e);
            setUpdateState(prev => ({
                ...prev,
                loading: false,
                error: e instanceof Error ? e.message : 'Unknown error',
                checked: true
            }));
        }
    }, [tryNotify]);

    // Automatic check on interval.
    // Uses only stable dependencies — the check reads lastNotifiedRef internally.
    useEffect(() => {
        if (!isLoaded || !checkForUpdates) return;

        // Delay the first check slightly so the app is fully initialized.
        const initialTimer = setTimeout(() => {
            performAutoCheck();
        }, INITIAL_CHECK_DELAY_MS);

        const interval = setInterval(performAutoCheck, CHECK_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, [isLoaded, checkForUpdates, performAutoCheck]);

    const dismissNotification = useCallback(() => {
        setUpdateState(prev => ({ ...prev, available: false }));
        // Restore default tray tooltip.
        dismissUpdateAvailable().catch(e =>
            console.error('[Harbor] Failed to dismiss update notification:', e)
        );
    }, []);

    return (
        <UpdateContext.Provider value={{
            checkForUpdates: checkForUpdates,
            setCheckForUpdates: setCheckForUpdates,
            lastNotifiedVersion: lastNotifiedVersion,
            checkNow: checkNow,
            dismissNotification: dismissNotification,
            updateState: updateState
        }}>
            {children}
        </UpdateContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdateContext() {
    const context = useContext(UpdateContext);
    if (context === undefined) {
        throw new Error('useUpdateContext must be used within an UpdateProvider');
    }
    return context;
}
