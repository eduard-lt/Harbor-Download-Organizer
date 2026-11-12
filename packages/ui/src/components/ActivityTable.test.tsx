import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityTable } from './ActivityTable';
import type { ActivityLog, OrganizeFailureGroup } from '../lib/tauri';

const makeLog = (overrides?: Partial<ActivityLog>): ActivityLog => ({
    id: '1', timestamp: '2024-01-01T10:00:00Z', filename: 'photo.jpg',
    icon: '📷', icon_color: '#fff', source_path: 'C:\\Downloads\\photo.jpg',
    dest_path: 'C:\\Pictures\\photo.jpg', rule_name: 'Images', status: 'success',
    ...overrides,
});

const makeFailureGroup = (overrides?: Partial<OrganizeFailureGroup>): OrganizeFailureGroup => ({
    code: 'filesystem_error',
    message: 'File operation failed',
    count: 1,
    failures: [
        {
            code: 'filesystem_error',
            message: 'File operation failed',
            legacy_error: 'legacy error',
            details: {
                source_path: 'C:\\Users\\Alice\\Downloads\\sub\\locked.txt',
                destination_path: 'C:\\Users\\Alice\\Downloads\\Docs\\locked.txt',
                reason: 'Access denied',
                remediation_hint: 'Close applications locking the file and retry.',
            },
        },
    ],
    legacy_errors: ['legacy error'],
    ...overrides,
});

describe('ActivityTable', () => {
    it('shows an empty state when no logs are provided', () => {
        render(<ActivityTable logs={[]} />);
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });

    it('explains an empty filtered result', () => {
        render(<ActivityTable logs={[]} filtered />);
        expect(screen.getByText('Nothing matches')).toBeInTheDocument();
    });

    it('renders a row with filename, destination, rule name and status', () => {
        render(<ActivityTable logs={[makeLog()]} />);
        const row = screen.getByRole('row', { name: /photo\.jpg/ });
        expect(row.querySelector('.name')).toHaveTextContent('photo.jpg');
        expect(screen.getByText('From Downloads\\photo.jpg')).toBeInTheDocument();
        expect(row.querySelector('.split-path')).toHaveTextContent('Pictures\\photo.jpg');
        expect(screen.getByText('Images')).toBeInTheDocument();
        expect(screen.getByText('Moved')).toBeInTheDocument();
    });

    it('shows a failed file as not moved instead of a destination', () => {
        render(<ActivityTable logs={[makeLog({ status: 'error' })]} />);
        expect(screen.getByText('Not moved, still in Downloads')).toBeInTheDocument();
        expect(document.querySelector('.split-path')).toBeNull();
    });

    it.each([
        ['success', 'Moved', 'ok'],
        ['error', 'Failed', 'danger'],
        ['conflict', 'Conflict', 'warn'],
        ['ignored', 'Skipped', 'muted'],
        ['recovered', 'Recovered', 'ok'],
        ['undone', 'Undone', 'muted'],
        ['unknown_status', 'Unknown_status', 'muted'],
    ])('labels status %s as %s with a %s dot', (statusValue, label, tone) => {
        render(<ActivityTable logs={[makeLog({ status: statusValue })]} />);
        const status = screen.getByText(label);
        expect(status.querySelector('.dot')).toHaveAttribute('data-tone', tone);
    });

    it('groups rows by day and shows the time', () => {
        const logs = [
            makeLog({ id: '1', timestamp: '2024-01-02 10:15:00' }),
            makeLog({ id: '2', filename: 'video.mp4', timestamp: '2024-01-02 09:00:00' }),
            makeLog({ id: '3', filename: 'old.zip', timestamp: '2024-01-01 08:30:00' }),
        ];
        render(<ActivityTable logs={logs} />);
        expect(screen.getAllByRole('columnheader').filter(h => h.getAttribute('scope') === 'colgroup')).toHaveLength(2);
        expect(screen.getByText('10:15')).toBeInTheDocument();
        expect(screen.getByText('08:30')).toBeInTheDocument();
    });

    it('renders multiple rows', () => {
        const logs = [makeLog({ id: '1' }), makeLog({ id: '2', filename: 'video.mp4', status: 'error' })];
        render(<ActivityTable logs={logs} />);
        expect(screen.getAllByText('photo.jpg').length).toBeGreaterThan(0);
        expect(screen.getByText('video.mp4')).toBeInTheDocument();
    });

    it('renders grouped failures with remediation hints', () => {
        render(<ActivityTable logs={[]} failureGroups={[makeFailureGroup()]} />);
        expect(screen.queryByText('filesystem_error')).not.toBeInTheDocument();
        expect(screen.getByText(/Access denied/)).toBeInTheDocument();
        expect(screen.getByText('Close applications locking the file and retry.')).toBeInTheDocument();
    });

    it('lets the user dismiss grouped failures', () => {
        const onDismiss = vi.fn();
        render(<ActivityTable logs={[]} failureGroups={[makeFailureGroup()]} onDismissFailures={onDismiss} />);
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss failures' }));
        expect(onDismiss).toHaveBeenCalled();
    });

    it('does not display raw absolute source paths in grouped failures', () => {
        render(<ActivityTable logs={[]} failureGroups={[makeFailureGroup()]} />);
        expect(screen.queryByText('C:\\Users\\Alice\\Downloads\\sub\\locked.txt')).not.toBeInTheDocument();
        expect(screen.getByText(/locked\.txt/)).toBeInTheDocument();
    });
});
