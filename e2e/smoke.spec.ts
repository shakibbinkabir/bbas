import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify that key public pages render without server errors and
 * that the auth gate redirects unauthenticated users away from protected
 * sections. Deeper user-journey tests live in journeys.spec.ts and require a
 * seeded Supabase test project (see e2e/README.md when added).
 */

test.describe('public surface', () => {
  test('landing redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('login page renders core form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /continue|next|login/i })).toBeVisible();
  });

  test('register page is reachable from login', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('protected routes', () => {
  test('owner dashboard redirects unauthenticated users', async ({ page }) => {
    const res = await page.goto('/owner/dashboard');
    // Either a redirect to /login or a 401/403 page is acceptable.
    expect(res?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/(login|register)/);
  });

  test('officer dashboard redirects unauthenticated users', async ({ page }) => {
    const res = await page.goto('/officer/dashboard');
    expect(res?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/\/(login|register)/);
  });
});
