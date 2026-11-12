import { test, expect, setupMocks, navigateTo } from './fixtures';

test('onboarding cues monitoring until it starts, and reset replays the cue', async ({ page }) => {
  await setupMocks(page, { tutorialCompleted: false });
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start monitoring' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('dialog', { name: 'Monitoring is off for now' })).toBeVisible();
  await page.getByRole('button', { name: 'Got it' }).click();
  const start = page.getByRole('button', { name: 'Start monitoring' });
  const monitor = page.locator('#sidebar-service-toggle');
  await expect(start).toBeInViewport();
  await expect(monitor).toHaveAttribute('data-cue', '');
  await start.click();
  await expect(page.getByRole('switch', { name: 'Active monitoring' })).toBeChecked();
  await expect(start).toHaveCount(0);
  await page.getByRole('switch', { name: 'Active monitoring' }).uncheck();
  await expect(start).toHaveCount(0);

  await navigateTo(page, 'Settings');
  await page.getByRole('button', { name: 'Reset…' }).click();
  await page.getByRole('button', { name: 'Reset everything' }).click();
  await expect(page.getByRole('dialog', { name: 'Welcome to Harbor' })).toBeVisible();
  await expect(start).toHaveCount(0);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Got it' }).click();
  await expect(start).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(start).toHaveCSS('animation-name', 'none');
});
