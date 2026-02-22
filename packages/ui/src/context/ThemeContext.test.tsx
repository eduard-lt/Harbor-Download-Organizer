import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import * as React from 'react';
import { ThemeProvider, useTheme } from './ThemeContext';

const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(ThemeProvider, { children });

describe('ThemeContext', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('dark');

        // Default system preference to light
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: false,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);
    });

    it('defaults to "system" theme when no localStorage value', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('system');
    });

    it('reads theme from localStorage', () => {
        localStorage.setItem('harbor-theme', 'dark');
        const { result } = renderHook(() => useTheme(), { wrapper });
        expect(result.current.theme).toBe('dark');
    });

    it('setTheme updates the theme state', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => {
            result.current.setTheme('dark');
        });
        expect(result.current.theme).toBe('dark');
    });

    it('setTheme("dark") sets isDark to true and adds "dark" class on html', async () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => { result.current.setTheme('dark'); });
        await waitFor(() => expect(result.current.isDark).toBe(true));
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('setTheme("light") sets isDark to false and removes "dark" class', async () => {
        document.documentElement.classList.add('dark');
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => { result.current.setTheme('light'); });
        await waitFor(() => expect(result.current.isDark).toBe(false));
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('system theme uses matchMedia to determine dark mode', async () => {
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);

        const { result } = renderHook(() => useTheme(), { wrapper });
        await waitFor(() => expect(result.current.isDark).toBe(true));
    });

    it('persists theme to localStorage on change', () => {
        const { result } = renderHook(() => useTheme(), { wrapper });
        act(() => { result.current.setTheme('light'); });
        expect(localStorage.getItem('harbor-theme')).toBe('light');
    });

    it('useTheme throws when used outside ThemeProvider', () => {
        expect(() => renderHook(() => useTheme())).toThrow();
    });

    it('responds to system color scheme change events', async () => {
        let changeHandler: (() => void) | null = null;
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: false,
            addEventListener: (_: string, fn: EventListenerOrEventListenerObject) => {
                changeHandler = fn as () => void;
            },
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);

        const { result } = renderHook(() => useTheme(), { wrapper });
        // theme is 'system', matches is false so isDark is false
        await waitFor(() => expect(result.current.isDark).toBe(false));

        // Simulate system preference change
        vi.spyOn(window, 'matchMedia').mockReturnValue({
            matches: true,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        } as unknown as MediaQueryList);

        if (changeHandler) {
            act(() => { (changeHandler as () => void)(); });
        }

        await waitFor(() => expect(result.current.isDark).toBe(true));
    });
});
