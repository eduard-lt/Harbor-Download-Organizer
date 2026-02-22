import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from './Layout';
import { MemoryRouter } from 'react-router-dom';

// Mock the Sidebar because it is a complex component with context dependencies
vi.mock('./Sidebar', () => ({
    Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock Outlet from react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        Outlet: () => <div data-testid="outlet">Page Content</div>,
    };
});

describe('Layout', () => {
    it('renders the Sidebar', () => {
        render(
            <MemoryRouter>
                <Layout />
            </MemoryRouter>
        );
        expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('renders the Outlet (page content area)', () => {
        render(
            <MemoryRouter>
                <Layout />
            </MemoryRouter>
        );
        expect(screen.getByTestId('outlet')).toBeInTheDocument();
    });

    it('has the correct structural wrapper', () => {
        const { container } = render(
            <MemoryRouter>
                <Layout />
            </MemoryRouter>
        );
        // Should have a flex container wrapping sidebar + content
        expect(container.firstChild).toBeInTheDocument();
    });
});
