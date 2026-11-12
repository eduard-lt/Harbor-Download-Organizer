import { test, expect, setupMocks, navigateTo } from './fixtures';

test('compact window, monitoring tide and appearance preferences survive reload', async ({ page }, testInfo) => {
  await setupMocks(page);
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const name of ['Rules', 'Activity', 'Settings', 'Info & Guide']) {
    await expect(page.getByRole('link', { name, exact: true })).toBeInViewport();
  }
  const monitoring = page.getByRole('switch', { name: 'Active monitoring' });
  await expect(monitoring).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Buy me a coffee' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo last batch' })).toBeInViewport();

  // Keyboard focus draws the ring on the visible pill, never on the hidden input.
  await page.getByRole('button', { name: 'Source on GitHub' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(monitoring).toBeFocused();
  await expect(monitoring.locator('+ .switch-track')).toHaveCSS('outline-style', 'solid');

  // The shoreline carries monitoring state.
  const shell = page.locator('.shell');
  await expect(shell).toHaveAttribute('data-tide', 'out');
  await monitoring.check();
  await expect(shell).toHaveAttribute('data-tide', 'in');
  await expect(monitoring.locator('+ .switch-track')).toHaveCSS('background-color', 'rgb(11, 106, 117)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('rules-light.png') });

  await navigateTo(page, 'Settings');
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.getByRole('switch', { name: 'Reduce transparency' }).check();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Reduce transparency' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveClass(/reduce-transparency/);
  await expect(page.locator('.sidebar')).toHaveCSS('backdrop-filter', 'none');
  await expect(page.locator('.shore')).toBeHidden();
  await page.getByRole('switch', { name: 'Reduce transparency' }).uncheck();
  await navigateTo(page, 'Rules');
  await expect(page.getByRole('heading', { name: 'Rules' })).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).not.toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: testInfo.outputPath('rules-dark.png') });
});
