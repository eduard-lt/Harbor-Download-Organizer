import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import packageJson from '../../package.json';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';
import { getCheckUpdates, setCheckUpdates, getLastNotifiedVersion, setLastNotifiedVersion } from '../lib/tauri';

const GITHUB_REPO = 'eduard-lt/Harbor';

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

    const [updateState, setUpdateState] = useState<UpdateState>({
        available: false,
        hasUpdate: false,
        version: null,
        url: null,
        loading: false,
        error: null,
        checked: false
    });

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
                console.error('Failed to load update settings:', error);
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
            console.error('Failed to save check updates setting:', error);
        }
    }, []);

    const updateLastNotifiedVersion = useCallback(async (version: string) => {
        setLastNotifiedVersionState(version);
        try {
            await setLastNotifiedVersion(version);
        } catch (error) {
            console.error('Failed to save last notified version:', error);
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
            console.error('Update check failed:', error);
            setUpdateState(prev => ({
                ...prev,
                loading: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                checked: true
            }));
        }
    }, []);

    // Automatic check on interval
    useEffect(() => {
        if (!isLoaded || !checkForUpdates) return;

        const checkService = async () => {
            try {
                const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
                if (!response.ok) throw new Error('Failed to fetch release info');

                const data = await response.json();
                const latestVersion = data.tag_name.replace(/^v/, '');
                const currentVersion = packageJson.version;

                if (compareVersions(latestVersion, currentVersion) > 0) {
                    setUpdateState(prev => ({
                        ...prev,
                        available: true,
                        hasUpdate: true,
                        version: latestVersion,
                        url: data.html_url,
                        checked: true
                    }));

                    // Check if already notified
                    if (lastNotifiedVersion !== latestVersion) {
                        // Send notification
                        let granted = await isPermissionGranted();
                        if (!granted) {
                            const permission = await requestPermission();
                            granted = permission === 'granted';
                        }

                        if (granted) {
                            sendNotification({
                                title: 'Update Available',
                                body: `New version ${latestVersion} is available.`,
                            });
                        }

                        // Update persisted state
                        updateLastNotifiedVersion(latestVersion);
                    }
                }
            } catch (e) {
                console.error("Auto update check failed", e);
            }
        };

        checkService(); // Check immediately on mount/enable

        // Then interval
        const interval = setInterval(checkService, 1000 * 60 * 60 * 3); // 3 hours
        return () => clearInterval(interval);

    }, [isLoaded, checkForUpdates, lastNotifiedVersion, updateLastNotifiedVersion]);

    const dismissNotification = useCallback(() => {
        setUpdateState(prev => ({ ...prev, available: false }));
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

export function useUpdateContext() {
    const context = useContext(UpdateContext);
    if (context === undefined) {
        throw new Error('useUpdateContext must be used within an UpdateProvider');
    }
    return context;
}
