import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatCard } from './StatCard';

describe('StatCard', () => {
    it('renders label and value correctness', () => {
        render(
            <StatCard
                label="Test Label"
                value={1234}
                icon="home"
                iconBgClass="bg-blue-100"
                iconTextClass="text-blue-500"
            />
        );

        expect(screen.getByText('Test Label')).toBeInTheDocument();
        // Use regex to be flexible (1,234 or 1234)
        expect(screen.getByText(/1[,.]?234/)).toBeInTheDocument();
    });

    it('renders string value correctly', () => {
        render(
            <StatCard
                label="Status"
                value="Active"
                icon="info"
                iconBgClass="bg-green-100"
                iconTextClass="text-green-500"
            />
        );

        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
    });
});
