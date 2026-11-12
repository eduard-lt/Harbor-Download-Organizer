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
        await expectHeading(page, 'Rules');
        await expect(page.getByText('2 rules, 2 enabled')).toBeVisible();
        await expect(page.getByRole('region', { name: 'Watched folder' })).toContainText('/Users/test/Downloads');
        await expect(page.getByRole('link', { name: 'Rules', exact: true })).toHaveAttribute('aria-current', 'page');
    });

    test('navigates to Activity', async ({ page }) => {
        await navigateTo(page, 'Activity');
        await expectHeading(page, 'Activity');
        await expect(page.getByRole('row', { name: /photo.jpg/ }).first()).toBeVisible();
    });

    test('navigates to Settings', async ({ page }) => {
        await navigateTo(page, 'Settings');
        await expectHeading(page, 'Settings');
    });

    test('navigates to Info & Guide', async ({ page }) => {
        await navigateTo(page, 'Info & Guide');
        await expectHeading(page, 'Info & Guide');
        await expect(page.getByRole('heading', { name: 'How Harbor works' })).toBeVisible();
    });

    test('navigates back to Rules', async ({ page }) => {
        await navigateTo(page, 'Activity');
        await expectHeading(page, 'Activity');
        await navigateTo(page, 'Rules');
        await expectHeading(page, 'Rules');
    });

    test('skip link moves focus to the content sheet', async ({ page }) => {
        await page.keyboard.press('Tab');
        await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#main-content')).toBeFocused();
    });
});
