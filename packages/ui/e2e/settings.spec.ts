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

    test('shows service status as stopped by default', async ({ page }) => {
        await expect(page.getByText('Service is Stopped')).toBeVisible();
    });

    test('toggles service on and off', async ({ page }) => {
        // Turn on — checkbox overlay div intercepts clicks, use force
        const toggleSection = page.locator('section').filter({ hasText: 'Service Status' });
        await toggleSection.getByRole('checkbox').click({ force: true });

        await expect(page.getByText('Service is Running')).toBeVisible({ timeout: 5000 });

        // Turn off
        await toggleSection.getByRole('checkbox').click({ force: true });
        await expect(page.getByText('Service is Stopped')).toBeVisible({ timeout: 5000 });
    });

    test('switches theme to dark', async ({ page }) => {
        await page.getByText('Dark').first().click();

        // The dark theme card should show selected state
        const darkCard = page.locator('.group.cursor-pointer').filter({ hasText: 'Dark' }).first();
        await expect(darkCard.locator('.border-primary')).toBeVisible();
    });

    test('switches theme to system', async ({ page }) => {
        await page.getByText('System').first().click();
        const systemCard = page.locator('.group.cursor-pointer').filter({ hasText: 'System' }).first();
        await expect(systemCard.locator('.border-primary')).toBeVisible();
    });

    test('organize now shows result feedback', async ({ page }) => {
        await page.getByRole('button', { name: 'Organize Now' }).click();

        // Should show feedback message — multiple elements match, use first()
        await expect(page.getByText(/files moved/).first()).toBeVisible({ timeout: 5000 });
    });

    test('organize now button disabled while running', async ({ page }) => {
        // Set up a slow organize response by overriding the mock after init
        await page.evaluate(() => {
            window.__e2eMocks.invoke['trigger_organize_now'] = () => new Promise(resolve => {
                setTimeout(() => resolve({
                    status: 'success', message: '2 files moved.', moved_count: 2, moved: 2,
                    total_failures: 0, errors: [], failure_groups: [],
                }), 2000);
            });
        });

        await page.getByRole('button', { name: 'Organize Now' }).click();
        await expect(page.getByRole('button', { name: 'Organizing...' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Organizing...' })).toBeDisabled();
    });

    test('factory reset shows confirmation', async ({ page }) => {
        await page.getByRole('button', { name: 'Reset All Settings' }).click();
        await expect(page.getByText('Reset to Defaults?')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Yes, Reset Everything' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'No, Keep Settings' })).toBeVisible();
    });

    test('factory reset can be cancelled', async ({ page }) => {
        await page.getByRole('button', { name: 'Reset All Settings' }).click();
        await page.getByRole('button', { name: 'No, Keep Settings' }).click();
        await expect(page.getByText('Reset to Defaults?')).not.toBeVisible();
    });

    test('factory reset can be confirmed', async ({ page }) => {
        await page.getByRole('button', { name: 'Reset All Settings' }).click();
        await page.getByRole('button', { name: 'Yes, Reset Everything' }).click();

        // Confirmation modal dismissed, feedback shown
        await expect(page.getByText('Reset to Defaults?')).not.toBeVisible();
        await expect(page.getByText(/reset to defaults/i)).toBeVisible();
    });
});
