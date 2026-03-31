import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export function useDpiAwareness() {
    const [scaleFactor, setScaleFactor] = useState<number>(1);
    const [isHighDpi, setIsHighDpi] = useState<boolean>(false);

    useEffect(() => {
        const checkDpi = async () => {
            try {
                const window = getCurrentWindow();
                const factor = await window.scaleFactor();
                setScaleFactor(factor);
                setIsHighDpi(factor > 1.0);
                
                if (factor !== 1.0) {
                    console.log(`[Harbor] DPI scale factor detected: ${factor}x (${Math.round(factor * 100)}%)`);
                }
            } catch (error) {
                console.error('Failed to get DPI scale factor:', error);
            }
        };

        checkDpi();
    }, []);

    return { scaleFactor, isHighDpi };
}
