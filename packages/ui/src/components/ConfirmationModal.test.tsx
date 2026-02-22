import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmationModal } from './ConfirmationModal';

describe('ConfirmationModal', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders nothing when isOpen is false', () => {
        const { container } = render(
            <ConfirmationModal isOpen={false} title="Delete?" message="Are you sure?" onConfirm={onConfirm} onCancel={onCancel} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('renders title and message when isOpen is true', () => {
        render(
            <ConfirmationModal isOpen={true} title="Delete Rule" message="This will be permanent." onConfirm={onConfirm} onCancel={onCancel} />
        );
        expect(screen.getByText('Delete Rule')).toBeInTheDocument();
        expect(screen.getByText('This will be permanent.')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button is clicked', () => {
        render(
            <ConfirmationModal isOpen={true} title="Delete?" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />
        );
        fireEvent.click(screen.getByText('Confirm'));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
        render(
            <ConfirmationModal isOpen={true} title="Delete?" message="Sure?" onConfirm={onConfirm} onCancel={onCancel} />
        );
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('uses custom label for buttons', () => {
        render(
            <ConfirmationModal isOpen={true} title="D?" message="M?" confirmLabel="Yes, delete" cancelLabel="No, keep it" onConfirm={onConfirm} onCancel={onCancel} />
        );
        expect(screen.getByText('Yes, delete')).toBeInTheDocument();
        expect(screen.getByText('No, keep it')).toBeInTheDocument();
    });

    it('applies destructive button style when isDestructive=true', () => {
        render(
            <ConfirmationModal isOpen={true} title="D?" message="M?" isDestructive={true} onConfirm={onConfirm} onCancel={onCancel} />
        );
        const confirmBtn = screen.getByText('Confirm');
        expect(confirmBtn.className).toContain('bg-red-600');
    });

    it('applies indigo button style when isDestructive=false (default)', () => {
        render(
            <ConfirmationModal isOpen={true} title="D?" message="M?" onConfirm={onConfirm} onCancel={onCancel} />
        );
        const confirmBtn = screen.getByText('Confirm');
        expect(confirmBtn.className).toContain('bg-indigo-600');
    });

    it('calls onCancel when Escape key is pressed while open', () => {
        render(
            <ConfirmationModal isOpen={true} title="D?" message="M?" onConfirm={onConfirm} onCancel={onCancel} />
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onCancel when Escape key is pressed while closed', () => {
        render(
            <ConfirmationModal isOpen={false} title="D?" message="M?" onConfirm={onConfirm} onCancel={onCancel} />
        );
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(onCancel).not.toHaveBeenCalled();
    });
});
