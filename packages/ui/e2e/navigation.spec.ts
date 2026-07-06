/**
 * E2E: Navigation between pages via sidebar.
 */
import { test, expect } from './fixtures';
import { setupMocks, navigateTo, expectHeading } from './fixtures';

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/');
    });

    test('lands on Rules page by default', async ({ page }) => {
        await expectHeading(page, 'Rules Management');
        await expect(page.getByText('Total Rules')).toBeVisible();
        await expect(page.getByText('Active Rules')).toBeVisible();
    });

    test('navigates to Activity Logs', async ({ page }) => {
        await navigateTo(page, 'Activity Logs');
        await expectHeading(page, 'Activity Logs');
    });

    test('navigates to Settings', async ({ page }) => {
        await navigateTo(page, 'Settings');
        await expectHeading(page, 'Settings');
    });

    test('navigates to Info & Guide', async ({ page }) => {
        await navigateTo(page, 'Info & Guide');
        await expectHeading(page, 'Info & Guide');
    });

    test('navigates back to Rules', async ({ page }) => {
        await navigateTo(page, 'Activity Logs');
        await expectHeading(page, 'Activity Logs');
        await navigateTo(page, 'Rules');
        await expectHeading(page, 'Rules Management');
    });
});
