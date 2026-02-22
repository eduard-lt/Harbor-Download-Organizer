import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityLogsPage } from './ActivityLogsPage';

// Mock the useActivity hook
vi.mock('../hooks/useActivity', () => ({
    useActivity: vi.fn(),
}));

import { useActivity } from '../hooks/useActivity';
import type { ActivityLog, ActivityStats } from '../lib/tauri';

const makeMockLog = (id: string): ActivityLog => ({
    id, timestamp: '2024-01-01T10:00:00Z', filename: `file${id}.jpg`,
    icon: '📷', icon_color: '#fff', source_path: 'C:\\Downloads\\file.jpg',
    dest_path: 'C:\\Pictures\\file.jpg', rule_name: 'Images', status: 'success',
});

const mockStats: ActivityStats = {
    total_files_moved: 10, files_moved_today: 2, files_moved_this_week: 5,
};

describe('ActivityLogsPage', () => {
    const mockUseActivity = {
        logs: [makeMockLog('1'), makeMockLog('2')],
        stats: mockStats,
        loading: false,
        error: null,
        hasMore: false,
        total: 2,
        refresh: vi.fn(),
        loadMore: vi.fn(),
        clearLogs: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useActivity).mockReturnValue(mockUseActivity);
    });

    it('renders the header with title', () => {
        render(<ActivityLogsPage />);
        expect(screen.getByText('Activity Logs')).toBeInTheDocument();
    });

    it('shows total count in subtitle', () => {
        render(<ActivityLogsPage />);
        expect(screen.getByText('2 moves recorded')).toBeInTheDocument();
    });

    it('renders activity rows', () => {
        render(<ActivityLogsPage />);
        expect(screen.getByText('file1.jpg')).toBeInTheDocument();
        expect(screen.getByText('file2.jpg')).toBeInTheDocument();
    });

    it('shows loading state when loading and no logs', () => {
        vi.mocked(useActivity).mockReturnValue({
            ...mockUseActivity, logs: [], loading: true,
        });
        render(<ActivityLogsPage />);
        expect(screen.getByText('Loading activity...')).toBeInTheDocument();
    });

    it('shows error banner when error is present', () => {
        vi.mocked(useActivity).mockReturnValue({
            ...mockUseActivity, error: 'Network error',
        });
        render(<ActivityLogsPage />);
        expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('shows Load More button when hasMore is true', () => {
        vi.mocked(useActivity).mockReturnValue({
            ...mockUseActivity, hasMore: true,
        });
        render(<ActivityLogsPage />);
        expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('calls loadMore when Load More button is clicked', () => {
        vi.mocked(useActivity).mockReturnValue({
            ...mockUseActivity, hasMore: true,
        });
        render(<ActivityLogsPage />);
        fireEvent.click(screen.getByText('Load More'));
        expect(mockUseActivity.loadMore).toHaveBeenCalled();
    });

    it('shows Loading... when loading and hasMore is true', () => {
        vi.mocked(useActivity).mockReturnValue({
            ...mockUseActivity, hasMore: true, loading: true,
        });
        render(<ActivityLogsPage />);
        const buttons = screen.getAllByText('Loading...');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows empty table state when logs array is empty and not loading', () => {
        vi.mocked(useActivity).mockReturnValue({
            ...mockUseActivity, logs: [],
        });
        render(<ActivityLogsPage />);
        expect(screen.getByText('No activity logs found.')).toBeInTheDocument();
    });
});
