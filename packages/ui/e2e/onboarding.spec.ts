import { test, expect, setupMocks, navigateTo } from './fixtures';

test('guided first run previews, adjusts rules and starts monitoring', async ({ page }) => {
  await setupMocks(page, { tutorialCompleted: false });
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeVisible();
  await page.getByRole('button', { name: 'Set up Harbor' }).click();
  await expect(page.getByRole('dialog', { name: 'Where your downloads land' })).toContainText('/Users/test/Downloads');
  await page.getByRole('button', { name: 'Next' }).click();
  const documents = page.getByRole('switch', { name: 'Use Documents' });
  await documents.uncheck();
  await expect(documents).not.toBeChecked();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/1 file already in Downloads would move/)).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('dialog', { name: 'Ready when you are' })).toBeInViewport();
  await page.getByRole('dialog').getByRole('button', { name: 'Start monitoring' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Active monitoring' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Enable Documents' })).not.toBeChecked();
});

test('starting later leaves an invitation in the top bar, and reset replays setup', async ({ page }) => {
  await setupMocks(page, { tutorialCompleted: false });
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip setup' }).click();
  const start = page.getByRole('button', { name: 'Start monitoring' });
  await expect(start).toBeInViewport();
  await expect(page.locator('#sidebar-service-toggle')).toHaveAttribute('data-cue', '');
  await start.click();
  await expect(page.getByRole('switch', { name: 'Active monitoring' })).toBeChecked();
  await expect(start).toHaveCount(0);

  await navigateTo(page, 'Settings');
  await page.getByRole('button', { name: 'Reset…' }).click();
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeVisible();
  await page.getByRole('button', { name: 'Skip setup' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('switch', { name: 'Active monitoring' })).toHaveCount(1);
});
