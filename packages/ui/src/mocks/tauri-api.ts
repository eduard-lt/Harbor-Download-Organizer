/**
 * E2E mock implementation of Tauri APIs.
 *
 * The Vite E2E config aliases @tauri-apps/api/core, @tauri-apps/api/event,
 * @tauri-apps/plugin-shell, and @tauri-apps/plugin-dialog to this module.
 *
 * Playwright tests configure mock data via window.__e2eMocks before page load.
 */

interface E2EMockState {
    invoke: Record<string, (...args: unknown[]) => unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- contravariance: (payload: T) => void requires any, not unknown
    listenCallbacks: Record<string, (payload: any) => void>;
}

declare global {
    interface Window {
        __e2eMocks: E2EMockState;
    }
}

function getMocks(): E2EMockState {
    if (!window.__e2eMocks) {
        window.__e2eMocks = { invoke: {}, listenCallbacks: {} };
    }
    return window.__e2eMocks;
}

// -- @tauri-apps/api/core --

export async function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const mocks = getMocks();
    const handler = mocks.invoke[cmd];
    if (!handler) {
        throw new Error(`E2E Mock: No handler registered for invoke("${cmd}"). Add it via window.__e2eMocks.invoke["${cmd}"]`);
    }
    return handler(args ?? {}) as T;
}

// -- @tauri-apps/api/event --

export type UnlistenFn = () => void;

export async function listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<UnlistenFn> {
    const mocks = getMocks();
    mocks.listenCallbacks[event] = (payload: T) => handler({ payload });
    return () => {
        delete mocks.listenCallbacks[event];
    };
}

// -- @tauri-apps/plugin-shell --
// -- @tauri-apps/plugin-dialog --
// Both plugins export `open`. In E2E: shell.open() is a no-op,
// dialog.open() returns null (cancelled picker).

export async function open(): Promise<void | string | null> {
    return null;
}

// -- @tauri-apps/api/window --

export function getCurrentWindow() {
    return {
        setSize: () => Promise.resolve(),
        setPosition: () => Promise.resolve(),
        center: () => Promise.resolve(),
        innerSize: () => Promise.resolve({ width: 1280, height: 800 }),
        outerSize: () => Promise.resolve({ width: 1280, height: 800 }),
        outerPosition: () => Promise.resolve({ x: 0, y: 0 }),
        scaleFactor: () => Promise.resolve(1),
        onResized: () => Promise.resolve(() => {}),
        onMoved: () => Promise.resolve(() => {}),
        onScaleChanged: () => Promise.resolve(() => {}),
        setResizable: () => Promise.resolve(),
    };
}

export class LogicalSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}

export class LogicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export class PhysicalPosition {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export async function currentMonitor() {
    return {
        name: 'Mock Monitor',
        scaleFactor: 1,
        size: { width: 1920, height: 1080 },
        position: { x: 0, y: 0 },
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tauri Monitor type is complex; mock just needs a placeholder
export type Monitor = any;

// -- @tauri-apps/plugin-notification --

export function sendNotification(): void {}
export function requestPermission(): Promise<'granted' | 'denied'> {
    return Promise.resolve('granted');
}
export function isPermissionGranted(): Promise<boolean> {
    return Promise.resolve(true);
}
