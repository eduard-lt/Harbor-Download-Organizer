import { useEffect, useState, useRef, useCallback } from 'react';
import { getCurrentWindow, currentMonitor, type Monitor } from '@tauri-apps/api/window';
import type { UnlistenFn } from '@tauri-apps/api/event';

export function useDpiAwareness() {
    const [scaleFactor, setScaleFactor] = useState<number>(1);
    const [isHighDpi, setIsHighDpi] = useState<boolean>(false);
    const [monitorName, setMonitorName] = useState<string | null>(null);
    const monitorCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scaleUnlistenRef = useRef<UnlistenFn | null>(null);
    const moveUnlistenRef = useRef<UnlistenFn | null>(null);

    const checkMonitor = useCallback(async () => {
        try {
            const monitor: Monitor | null = await currentMonitor();
            if (monitor) {
                setScaleFactor(monitor.scaleFactor);
                setIsHighDpi(monitor.scaleFactor > 1.0);
                setMonitorName(monitor.name);
                console.log(
                    `[Harbor] Monitor: "${monitor.name ?? 'unknown'}" — ${monitor.scaleFactor}x (${monitor.size.width}x${monitor.size.height})`
                );
            }
        } catch (error) {
            console.error('[Harbor] Failed to get monitor info:', error);
        }
    }, []);

    useEffect(() => {
        const window = getCurrentWindow();

        // 1. Reactively listen for scale factor changes (monitor switch, system DPI change)
        window.onScaleChanged(({ payload }) => {
            console.log(
                `[Harbor] Scale factor changed to ${payload.scaleFactor}x (window size: ${payload.size.width}x${payload.size.height})`
            );
            setScaleFactor(payload.scaleFactor);
            setIsHighDpi(payload.scaleFactor > 1.0);
            // Re-check monitor info for the name
            checkMonitor();
        }).then((unlisten) => {
            scaleUnlistenRef.current = unlisten;
        });

        // 2. When window moves between monitors, debounce the monitor check
        window.onMoved(() => {
            if (monitorCheckTimeoutRef.current) {
                clearTimeout(monitorCheckTimeoutRef.current);
            }
            // Debounce: only check after window stops moving for 300ms
            monitorCheckTimeoutRef.current = setTimeout(() => {
                checkMonitor();
            }, 300);
        }).then((unlisten) => {
            moveUnlistenRef.current = unlisten;
        });

        // 3. Initial check
        checkMonitor();

        return () => {
            if (scaleUnlistenRef.current) scaleUnlistenRef.current();
            if (moveUnlistenRef.current) moveUnlistenRef.current();
            if (monitorCheckTimeoutRef.current) clearTimeout(monitorCheckTimeoutRef.current);
        };
    }, [checkMonitor]);

    return { scaleFactor, isHighDpi, monitorName };
}
