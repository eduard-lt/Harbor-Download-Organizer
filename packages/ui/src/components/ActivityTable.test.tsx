import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTable } from './ActivityTable';
import type { ActivityLog } from '../lib/tauri';

const makeLog = (overrides?: Partial<ActivityLog>): ActivityLog => ({
    id: '1', timestamp: '2024-01-01T10:00:00Z', filename: 'photo.jpg',
    icon: '📷', icon_color: '#fff', source_path: 'C:\\Downloads\\photo.jpg',
    dest_path: 'C:\\Pictures\\photo.jpg', rule_name: 'Images', status: 'success',
    ...overrides,
});

describe('ActivityTable', () => {
    it('shows empty state when no logs provided', () => {
        render(<ActivityTable logs={[]} />);
        expect(screen.getByText('No activity logs found.')).toBeInTheDocument();
    });

    it('shows count of results in footer', () => {
        render(<ActivityTable logs={[makeLog()]} />);
        expect(screen.getByText('Showing 1 results')).toBeInTheDocument();
    });

    it('renders a row with filename, paths, rule name and status', () => {
        render(<ActivityTable logs={[makeLog()]} />);
        expect(screen.getByText('photo.jpg')).toBeInTheDocument();
        expect(screen.getByText('C:\\Downloads\\photo.jpg')).toBeInTheDocument();
        expect(screen.getByText('C:\\Pictures\\photo.jpg')).toBeInTheDocument();
        expect(screen.getByText('Images')).toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('renders status with correct badge class for success', () => {
        const { container } = render(<ActivityTable logs={[makeLog({ status: 'success' })]} />);
        const badge = container.querySelector('.bg-emerald-100');
        expect(badge).toBeInTheDocument();
    });

    it('renders status with correct badge class for error', () => {
        const { container } = render(<ActivityTable logs={[makeLog({ status: 'error' })]} />);
        const badge = container.querySelector('.bg-red-100');
        expect(badge).toBeInTheDocument();
    });

    it('renders status with correct badge class for conflict', () => {
        const { container } = render(<ActivityTable logs={[makeLog({ status: 'conflict' })]} />);
        const badge = container.querySelector('.bg-yellow-100');
        expect(badge).toBeInTheDocument();
    });

    it('renders status with correct badge class for ignored', () => {
        const { container } = render(<ActivityTable logs={[makeLog({ status: 'ignored' })]} />);
        const badge = container.querySelector('.bg-slate-100');
        expect(badge).toBeInTheDocument();
    });

    it('falls back to ignored class for unknown status', () => {
        const { container } = render(<ActivityTable logs={[makeLog({ status: 'unknown_status' })]} />);
        // Should fall back to 'ignored' class
        const badge = container.querySelector('.bg-slate-100');
        expect(badge).toBeInTheDocument();
    });

    it('renders multiple rows', () => {
        const logs = [makeLog({ id: '1' }), makeLog({ id: '2', filename: 'video.mp4', status: 'error' })];
        render(<ActivityTable logs={logs} />);
        expect(screen.getByText('photo.jpg')).toBeInTheDocument();
        expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });

    it('capitalizes status text', () => {
        render(<ActivityTable logs={[makeLog({ status: 'success' })]} />);
        expect(screen.getByText('Success')).toBeInTheDocument();
    });
});
