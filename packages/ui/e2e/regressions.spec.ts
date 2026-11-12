import { test, expect, setupMocks } from './fixtures';

test('filtered drag uses the full rule order', async ({ page }) => {
    const rules = ['Other', 'Match One', 'Hidden', 'Match Two'].map((name, i) => ({
        id: String(i), name, extensions: ['txt'], destination: '/tmp/target',
        enabled: true, create_symlink: false, icon: 'description', icon_color: 'blue',
    }));
    await setupMocks(page, { rules, checkUpdates: false });
    await page.goto('/');
    const search = page.getByRole('searchbox', { name: 'Search rules' });
    await search.fill('Match');
    const handles = page.getByTitle('Drag to reorder');
    const source = await handles.nth(0).boundingBox();
    const target = await handles.nth(1).boundingBox();
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 10 });
    await page.mouse.up();
    await search.fill('');
    await expect(page.locator('tbody tr').nth(3)).toContainText('Match One');
    await expect(page.locator('tbody tr').nth(1)).toContainText('Hidden');
});

test('rules reorder from the keyboard', async ({ page }) => {
    await setupMocks(page, { checkUpdates: false });
    await page.goto('/');
    const down = page.getByRole('button', { name: 'Move Images down' });
    await down.focus();
    await expect(down).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('tbody tr').nth(0)).toContainText('Documents');
    await expect(page.locator('tbody tr').nth(1)).toContainText('Images');
});

test('rule validation fits the minimum window and keeps actions reachable', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await setupMocks(page, { checkUpdates: false });
    await page.goto('/');
    await page.getByRole('button', { name: 'New rule' }).click();
    await expect(page.getByRole('button', { name: 'Save rule' })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
    await page.getByRole('textbox', { name: 'Rule name', exact: true }).fill('Test');
    await page.getByRole('textbox', { name: 'Destination folder', exact: true }).fill('/tmp/test');
    await page.evaluate(() => {
        window.__e2eMocks.invoke.create_rule = () => { throw new Error('Destination is not writable. Choose another folder.'); };
    });
    await page.getByRole('button', { name: 'Save rule' }).click();
    await expect(page.getByText('Destination is not writable. Choose another folder.')).toBeVisible();
    const bounds = await page.getByRole('dialog').boundingBox();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(700);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('file preview and undo errors remain usable in the minimum window', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 700 });
    await setupMocks(page, { checkUpdates: false });
    await page.goto('/settings');
    await page.evaluate(() => {
        window.__e2eMocks.invoke.preview_organization = () => ({ moves: [{ source: 'C:/Downloads/report.pdf', destination: 'C:/Documents/report.pdf', rule: 'Documents' }], errors: [] });
        window.__e2eMocks.invoke.undo_last_batch = () => { throw new Error('Undo refused: report.pdf has changed'); };
    });
    await page.getByRole('button', { name: 'Preview moves' }).click();
    const preview = page.getByRole('dialog', { name: 'Preview moves' });
    await expect(preview.getByText('1 file would move', { exact: false })).toBeVisible();
    await expect(preview.getByText('report.pdf', { exact: true })).toBeVisible();
    await expect(preview.getByText('Preview never moves files.')).toBeVisible();
    await page.screenshot({ path: '../../target/release-settings-preview.png', fullPage: true });
    await preview.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo last batch' }).click();
    await expect(page.getByRole('alertdialog')).toBeInViewport();
    await page.getByRole('button', { name: 'Undo batch', exact: true }).click();
    await expect(page.getByText('Undo refused: report.pdf has changed')).toBeVisible();
});
