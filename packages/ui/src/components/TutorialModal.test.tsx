import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorialModal } from './TutorialModal';

describe('TutorialModal', () => {
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when isOpen is false', () => {
        const { container } = render(<TutorialModal isOpen={false} onClose={onClose} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders step 1 content by default when opened', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        expect(screen.getByText('Welcome to Harbor!')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('advances to step 2 when Next is clicked', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Next'));
        expect(screen.getByText('Ready to Launch?')).toBeInTheDocument();
    });

    it('goes back to step 1 when Back is clicked from step 2', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Next'));
        expect(screen.getByText('Ready to Launch?')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Back'));
        expect(screen.getByText('Welcome to Harbor!')).toBeInTheDocument();
    });

    it('calls onClose when Got it! is clicked', () => {
        render(<TutorialModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Next'));
        fireEvent.click(screen.getByText('Got it!'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('resets to step 1 when reopened (isOpen changes)', () => {
        const { rerender } = render(<TutorialModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Next')); // go to step 2
        expect(screen.getByText('Ready to Launch?')).toBeInTheDocument();

        rerender(<TutorialModal isOpen={false} onClose={onClose} />);
        rerender(<TutorialModal isOpen={true} onClose={onClose} />);

        expect(screen.getByText('Welcome to Harbor!')).toBeInTheDocument();
    });

    it('highlights sidebar toggle element when Got it! is clicked if element exists', () => {
        // Create a fake sidebar toggle element
        const div = document.createElement('div');
        div.id = 'sidebar-service-toggle';
        document.body.appendChild(div);

        render(<TutorialModal isOpen={true} onClose={onClose} />);
        fireEvent.click(screen.getByText('Next'));
        fireEvent.click(screen.getByText('Got it!'));

        expect(div.classList.contains('ring-4')).toBe(true);
        document.body.removeChild(div);
    });
});
