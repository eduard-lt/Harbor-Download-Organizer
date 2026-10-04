import { test, expect, setupMocks, navigateTo } from './fixtures';

test('compact navigation and appearance preferences survive reload', async ({ page }, testInfo) => {
  await setupMocks(page);
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const name of ['Rules', 'Activity Logs', 'Settings', 'Info & Guide']) {
    const link = page.getByRole('link', { name, exact: true });
    await expect(link).toBeInViewport();
  }
  await expect(page.getByRole('checkbox', { name: 'Active monitoring' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('rules-light.png') });
  await navigateTo(page, 'Settings');
  await page.getByRole('button', { name: 'Use dark theme', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reduce transparency' }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Reduce transparency' })).toBeChecked();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveClass(/reduce-transparency/);
  await expect(page.locator('.harbor-navigation')).toHaveCSS('backdrop-filter', 'none');
  await page.getByRole('checkbox', { name: 'Reduce transparency' }).uncheck();
  await navigateTo(page, 'Rules');
  await expect(page.getByRole('heading', { name: 'Rules Management' })).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).not.toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: testInfo.outputPath('rules-dark.png') });
});
