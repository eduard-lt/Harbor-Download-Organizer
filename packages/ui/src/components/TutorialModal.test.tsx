import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TutorialModal } from './TutorialModal';

const settings = vi.hoisted(() => ({
    downloadDir: 'C:\\Users\\you\\Downloads',
    serviceStatus: { running: false, pid: 0 },
    toggleService: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../hooks/useSettings', () => ({ useSettings: () => settings }));
const rules = vi.hoisted(() => ({
    rules: [
        { id: '1', name: 'Images', extensions: ['jpg', 'png'], destination: 'C:\\Users\\you\\Pictures', create_symlink: false, enabled: true, icon: 'image', icon_color: 'blue' },
        { id: '2', name: 'Disc images', extensions: ['iso'], destination: 'C:\\ISOs', create_symlink: false, enabled: false, icon: 'album', icon_color: 'slate' },
    ],
    toggleRule: vi.fn().mockResolvedValue(undefined),
    fetchRules: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../hooks/useRules', () => ({ useRules: () => rules }));
const fileActions = vi.hoisted(() => ({ busy: false, chooseFolder: vi.fn(), organizeNow: vi.fn() }));
vi.mock('../context/FileActionsContext', () => ({ useFileActions: () => fileActions }));
vi.mock('../lib/tauri', () => ({
    previewOrganization: vi.fn().mockResolvedValue({
        moves: [
            { source: 'C:\\Users\\you\\Downloads\\a.jpg', destination: 'C:\\Users\\you\\Pictures\\a.jpg', rule: 'Images' },
            { source: 'C:\\Users\\you\\Downloads\\b.png', destination: 'C:\\Users\\you\\Pictures\\b.png', rule: 'Images' },
        ],
        errors: [],
    }),
}));

import { previewOrganization } from '../lib/tauri';

const next = () => fireEvent.click(screen.getByRole('button', { name: /^(Next|Set up Harbor)$/ }));

describe('TutorialModal', () => {
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        settings.serviceStatus = { running: false, pid: 0 };
    });

    it('renders nothing when isOpen is false', () => {
        render(<TutorialModal isOpen={false} onClose={onClose} />);
        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('opens on a welcome step with the safety promises', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        expect(screen.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeInTheDocument();
        expect(screen.getByText('Preview first')).toBeInTheDocument();
        expect(screen.getByText('Never overwrites')).toBeInTheDocument();
        expect(screen.getByRole('list', { name: 'Step 1 of 5' })).toBeInTheDocument();
    });

    it('shows the watched folder and lets the user change it', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        next();
        expect(screen.getByRole('dialog', { name: 'Where your downloads land' })).toBeInTheDocument();
        expect(screen.getByText('C:\\Users\\you\\Downloads')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Change folder…' }));
        expect(fileActions.chooseFolder).toHaveBeenCalled();
    });

    it('lets the user switch starter rules on and off', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        next(); next();
        expect(screen.getByText('1 of 2 rules on.', { exact: false })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('switch', { name: 'Use Disc images' }));
        expect(rules.toggleRule).toHaveBeenCalledWith('2', true);
        expect(rules.fetchRules).toHaveBeenCalled();
    });

    it('previews which files would move using the real preview', async () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        next(); next();
        await act(async () => { next(); });
        expect(previewOrganization).toHaveBeenCalled();
        expect(await screen.findByText(/would move/)).toHaveTextContent('2 files already in Downloads would move');
        expect(screen.getByText('a.jpg, b.png')).toBeInTheDocument();
    });

    it('starts monitoring, optionally organizes, and clears the cue', async () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        next(); next();
        await act(async () => { next(); });
        await screen.findByText(/would move/);
        next();
        expect(screen.getByRole('dialog', { name: 'Ready when you are' })).toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Also move the 2 files already there'));
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start monitoring' })); });
        expect(settings.toggleService).toHaveBeenCalled();
        expect(fileActions.organizeNow).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(localStorage.getItem('harbor-monitoring-cue')).toBe('false');
    });

    it('Start later leaves monitoring off and sets the sidebar cue', async () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        next(); next();
        await act(async () => { next(); });
        next();
        fireEvent.click(screen.getByRole('button', { name: 'Start later' }));
        expect(settings.toggleService).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
        expect(localStorage.getItem('harbor-monitoring-cue')).toBe('true');
    });

    it('can go back and skip setup', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        next();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
        expect(screen.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Skip setup' }));
        expect(onClose).toHaveBeenCalled();
        expect(localStorage.getItem('harbor-monitoring-cue')).toBe('true');
    });

    it('resets to the first step when reopened', () => {
        const { rerender } = render(<TutorialModal isOpen={true} onClose={onClose} />);
        next();
        rerender(<TutorialModal isOpen={false} onClose={onClose} />);
        rerender(<TutorialModal isOpen={true} onClose={onClose} />);
        expect(screen.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeInTheDocument();
    });
});
