/**
 * E2E: Rules CRUD — create, edit, toggle, delete, and search rules.
 */
import { test, expect } from './fixtures';
import { setupMocks, expectHeading } from './fixtures';

test.describe('Rules CRUD', () => {
    test.beforeEach(async ({ page }) => {
        await setupMocks(page);
        await page.goto('/');
        await expectHeading(page, 'Rules Management');
    });

    test('renders existing rules in the table', async ({ page }) => {
        await expect(page.getByText('Images')).toBeVisible();
        await expect(page.getByText('Documents', { exact: true })).toBeVisible();
        await expect(page.getByText('jpg')).toBeVisible();
        await expect(page.getByText('pdf')).toBeVisible();
    });

    test('creates a new rule', async ({ page }) => {
        await page.getByRole('button', { name: 'New Rule' }).click();

        // Scope to the modal form to avoid matching page-level inputs (search bar, etc.)
        const form = page.locator('form');
        await form.getByPlaceholder('e.g. Images').fill('Videos');
        await form.getByPlaceholder('e.g. jpg, png, gif').fill('mp4, mkv');
        // Destination field: filler text is platform-dependent (~/Downloads/Images on Mac)
        await form.getByPlaceholder(/Downloads/).fill('/Users/test/Videos');

        // Save
        await form.getByRole('button', { name: 'Save Rule' }).click();

        // Should appear in table (use exact to avoid matching destination path)
        await expect(page.getByText('Videos', { exact: true })).toBeVisible();
    });

    test('edits an existing rule', async ({ page }) => {
        // Click edit on Images rule
        const row = page.getByRole('row', { name: /Images/ });
        await row.getByRole('button', { name: 'edit' }).click();

        // Change name
        await page.getByPlaceholder('e.g. Images').fill('Photos');
        await page.getByRole('button', { name: 'Save Rule' }).click();

        // Old name gone, new name present
        await expect(page.getByText('Photos')).toBeVisible();
        await expect(page.getByText('Images')).not.toBeVisible();
    });

    test('toggles a rule on and off', async ({ page }) => {
        // Images rule is enabled by default — check stats show Active Rules = 2
        await expect(page.getByText('Active Rules').locator('..').getByText('2')).toBeVisible();

        // Toggle Images off — checkbox overlay div intercepts clicks, use force
        const row = page.getByRole('row', { name: /Images/ });
        await row.getByRole('checkbox').click({ force: true });

        // Active count should drop to 1
        await expect(page.getByText('Active Rules').locator('..').getByText('1')).toBeVisible();
    });

    test('deletes a rule with confirmation', async ({ page }) => {
        const row = page.getByRole('row', { name: /Images/ });
        await row.getByRole('button', { name: 'delete_outline' }).click();

        // Confirmation modal — use exact match (there are also delete_outline icon buttons)
        await expect(page.getByText('Delete Rule')).toBeVisible();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();

        // Rule gone
        await expect(page.getByText('Images')).not.toBeVisible();
    });

    test('cancels rule deletion', async ({ page }) => {
        const row = page.getByRole('row', { name: /Images/ });
        await row.getByRole('button', { name: 'delete_outline' }).click();

        await expect(page.getByText('Delete Rule')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Modal dismissed, rule still there
        await expect(page.getByText('Delete Rule')).not.toBeVisible();
        await expect(page.getByText('Images')).toBeVisible();
    });

    test('filters rules by search', async ({ page }) => {
        await page.getByPlaceholder('Search rules...').fill('Doc');
        await expect(page.getByText('Images')).not.toBeVisible();
        await expect(page.getByText('Documents', { exact: true })).toBeVisible();

        // Clear
        await page.getByPlaceholder('Search rules...').fill('');
        await expect(page.getByText('Images')).toBeVisible();
    });

    test('shows empty state when no rules match', async ({ page }) => {
        await page.getByPlaceholder('Search rules...').fill('zzz_nonexistent');
        await expect(page.getByText('No rules found.')).toBeVisible();
    });
});
