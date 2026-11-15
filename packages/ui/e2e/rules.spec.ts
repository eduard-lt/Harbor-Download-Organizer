/**
 * E2E: Rules CRUD — create, edit, toggle, delete, and search rules.
 */
import { test, expect } from './fixtures';
import { setupMocks, expectHeading } from './fixtures';

test.describe('Rules CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/');
        await expectHeading(page, 'Rules');
    });

    test('renders existing rules in the table', async ({ page }) => {
        const images = page.getByRole('row', { name: /Images/ });
        await expect(images).toContainText('jpg, png, gif');
        await expect(images).toContainText('Pictures');
        await expect(page.getByRole('row', { name: /Documents/ })).toContainText('pdf, docx');
    });

    test('creates a new rule', async ({ page }) => {
        await page.getByRole('button', { name: 'New rule' }).click();

        const dialog = page.getByRole('dialog', { name: 'New rule' });
        await dialog.getByRole('textbox', { name: 'Rule name' }).fill('Videos');
        await dialog.getByRole('textbox', { name: 'File extensions' }).fill('mp4, mkv');
        await dialog.getByRole('textbox', { name: 'Destination folder' }).fill('/Users/test/Videos');
        await dialog.getByRole('button', { name: 'Save rule' }).click();

        await expect(page.getByRole('row', { name: /Videos/ })).toContainText('mp4, mkv');
        await expect(page.getByText('3 rules, 3 enabled')).toBeVisible();
    });

    test('edits an existing rule', async ({ page }) => {
        await page.getByRole('button', { name: 'Edit Images' }).click();
        await page.getByRole('textbox', { name: 'Rule name' }).fill('Photos');
        await page.getByRole('button', { name: 'Save rule' }).click();

        await expect(page.getByRole('row', { name: /Photos/ })).toBeVisible();
        await expect(page.getByRole('row', { name: /Images/ })).toHaveCount(0);
    });

    test('toggles a rule on and off', async ({ page }) => {
        await expect(page.getByText('2 rules, 2 enabled')).toBeVisible();
        const toggle = page.getByRole('switch', { name: 'Enable Images' });
        await toggle.uncheck();
        await expect(page.getByText('2 rules, 1 enabled')).toBeVisible();
        await toggle.check();
        await expect(page.getByText('2 rules, 2 enabled')).toBeVisible();
    });

    test('deletes a rule with confirmation', async ({ page }) => {
        await page.getByRole('button', { name: 'Delete Images' }).click();
        await expect(page.getByRole('alertdialog', { name: /Delete .Images.\?/ })).toBeVisible();
        await page.getByRole('button', { name: 'Delete rule', exact: true }).click();
        await expect(page.getByRole('row', { name: /Images/ })).toHaveCount(0);
    });

    test('cancels rule deletion', async ({ page }) => {
        await page.getByRole('button', { name: 'Delete Images' }).click();
        await expect(page.getByRole('alertdialog')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
        await expect(page.getByRole('row', { name: /Images/ })).toBeVisible();
    });

    test('filters rules by search', async ({ page }) => {
        const search = page.getByRole('searchbox', { name: 'Search rules' });
        await search.fill('Doc');
        await expect(page.getByRole('row', { name: /Images/ })).toHaveCount(0);
        await expect(page.getByRole('row', { name: /Documents/ })).toBeVisible();
        await search.fill('');
        await expect(page.getByRole('row', { name: /Images/ })).toBeVisible();
    });

    test('shows empty state when no rules match', async ({ page }) => {
        await page.getByRole('searchbox', { name: 'Search rules' }).fill('zzz_nonexistent');
        await expect(page.getByText(/No rules match/)).toBeVisible();
        await page.getByRole('button', { name: 'Clear search' }).click();
        await expect(page.getByRole('row', { name: /Images/ })).toBeVisible();
    });
});
