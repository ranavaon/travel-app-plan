import { test, expect } from '@playwright/test';

test.describe('Home and Trip', () => {
  test('loads app root and returns 200', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status()).toBe(200);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('navigating to /trip/new responds', async ({ page }) => {
    const res = await page.goto('/trip/new');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/trip\/new|\/login|\//);
  });
});
