/**
 * E2E: Settings page — service toggle, theme, organize now, factory reset.
 */
import { test, expect } from './fixtures';
import { setupMocks, expectHeading } from './fixtures';

test.describe('Settings', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/settings');
        await expectHeading(page, 'Settings');
    });

    test('shows monitoring as paused by default', async ({ page }) => {
        await expect(page.getByText('Monitoring is paused')).toBeVisible();
    });

    test('toggles service on and off', async ({ page }) => {
        const toggle = page.getByRole('switch', { name: 'Monitoring service' });
        await toggle.check();
        await expect(page.getByText('Monitoring is on')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.shell')).toHaveAttribute('data-tide', 'in');

        await toggle.uncheck();
        await expect(page.getByText('Monitoring is paused')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.shell')).toHaveAttribute('data-tide', 'out');
    });

    test('switches theme to dark', async ({ page }) => {
        await page.getByRole('radio', { name: 'Dark' }).check();
        await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('switches theme to system', async ({ page }) => {
        await page.getByRole('radio', { name: 'Match system' }).check();
        await expect(page.getByRole('radio', { name: 'Match system' })).toBeChecked();
    });

    test('organize now shows result feedback', async ({ page }) => {
        await page.getByRole('button', { name: 'Organize now' }).click();
        await expect(page.getByRole('status').filter({ hasText: '0 files moved.' })).toBeVisible({ timeout: 5000 });
    });

    test('organize now button disabled while running', async ({ page }) => {
        await page.evaluate(() => {
            window.__e2eMocks.invoke['trigger_organize_now'] = () => new Promise(resolve => {
                setTimeout(() => resolve({
                    status: 'success', message: '2 files moved.', moved_count: 2, moved: 2,
                    total_failures: 0, errors: [], failure_groups: [],
                }), 2000);
            });
        });

        await page.getByRole('button', { name: 'Organize now' }).click();
        await expect(page.getByRole('button', { name: 'Organizing…' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Organizing…' })).toBeDisabled();
    });

    test('factory reset shows confirmation', async ({ page }) => {
        await page.getByRole('button', { name: 'Reset…' }).click();
        await expect(page.getByRole('alertdialog', { name: 'Reset to defaults?' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Reset everything' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Keep my settings' })).toBeFocused();
    });

    test('factory reset can be cancelled', async ({ page }) => {
        await page.getByRole('button', { name: 'Reset…' }).click();
        await page.getByRole('button', { name: 'Keep my settings' }).click();
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
    });

    test('factory reset can be confirmed', async ({ page }) => {
        await page.getByRole('button', { name: 'Reset…' }).click();
        await page.getByRole('button', { name: 'Reset everything' }).click();
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
        await expect(page.getByText(/back to their defaults/i)).toBeVisible();
    });
});
