import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
    it('renders the title', () => {
        render(<Header title="Activity Logs" />);
        expect(screen.getByText('Activity Logs')).toBeInTheDocument();
    });

    it('renders the subtitle when provided', () => {
        render(<Header title="Rules" subtitle="5 rules configured" />);
        expect(screen.getByText('5 rules configured')).toBeInTheDocument();
    });

    it('does not render subtitle when not provided', () => {
        render(<Header title="Rules" />);
        expect(screen.queryByText(/rules configured/i)).not.toBeInTheDocument();
    });

    it('renders children when provided', () => {
        render(
            <Header title="Rules">
                <button>Add Rule</button>
            </Header>
        );
        expect(screen.getByRole('button', { name: 'Add Rule' })).toBeInTheDocument();
    });

    it('does not render children container when no children', () => {
        const { container } = render(<Header title="Rules" />);
        // children div wrapper should not exist
        const childWrapper = container.querySelector('div.flex.items-center.gap-4');
        expect(childWrapper).not.toBeInTheDocument();
    });
});
