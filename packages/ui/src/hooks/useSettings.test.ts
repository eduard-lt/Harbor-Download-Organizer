import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import * as React from 'react';
import { useSettings } from './useSettings';

// Mock the SettingsContext  
vi.mock('../context/SettingsContext', () => ({
    useSettingsContext: vi.fn(),
}));

import { useSettingsContext } from '../context/SettingsContext';

const mockContextValue = {
    serviceStatus: { running: false },
    startupEnabled: false,
    downloadDir: 'C:\\Downloads',
    loading: false,
    organizing: false,
    error: null,
    toggleService: vi.fn(),
    toggleStartup: vi.fn(),
    organizeNow: vi.fn(),
    reload: vi.fn(),
    reset: vi.fn(),
    refresh: vi.fn(),
};

describe('useSettings', () => {
    it('returns the value from useSettingsContext', () => {
        vi.mocked(useSettingsContext).mockReturnValue(mockContextValue);
        const { result } = renderHook(() => useSettings());
        expect(result.current).toEqual(mockContextValue);
    });

    it('proxies serviceStatus from context', () => {
        vi.mocked(useSettingsContext).mockReturnValue({ ...mockContextValue, serviceStatus: { running: true } });
        const { result } = renderHook(() => useSettings());
        expect(result.current.serviceStatus.running).toBe(true);
    });

    it('proxies error from context', () => {
        vi.mocked(useSettingsContext).mockReturnValue({ ...mockContextValue, error: 'some error' });
        const { result } = renderHook(() => useSettings());
        expect(result.current.error).toBe('some error');
    });
});
