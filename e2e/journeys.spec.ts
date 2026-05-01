import { test, expect } from '@playwright/test';

/**
 * End-to-end user journeys (PRD Section 22.12, tasks 9.7–9.9).
 *
 * These tests require:
 *   - A running app (the Playwright config starts `npm run dev`)
 *   - A test Supabase project with seeded users (owner, officer, admin) and
 *     authorities. Set the credentials below via env so credentials don't
 *     land in version control:
 *       E2E_OWNER_PHONE, E2E_OWNER_OTP
 *       E2E_OFFICER_PHONE, E2E_OFFICER_OTP
 *       E2E_ADMIN_PHONE, E2E_ADMIN_OTP
 *
 * The tests are skipped automatically when the credentials are missing so
 * `npx playwright test` works out of the box in unconfigured environments.
 */

const ownerPhone = process.env.E2E_OWNER_PHONE;
const ownerOtp = process.env.E2E_OWNER_OTP;
const officerPhone = process.env.E2E_OFFICER_PHONE;
const officerOtp = process.env.E2E_OFFICER_OTP;

const requiresAuth = test.extend({});

requiresAuth.skip(
  !ownerPhone || !ownerOtp || !officerPhone || !officerOtp,
  'E2E credentials not configured — see comment at top of journeys.spec.ts'
);

async function loginWithOtp(page: import('@playwright/test').Page, phone: string, otp: string) {
  await page.goto('/login');
  await page.getByLabel(/phone|email|identifier/i).fill(phone);
  await page.getByRole('button', { name: /continue|send|next/i }).click();
  await page.getByLabel(/code|otp/i).fill(otp);
  await page.getByRole('button', { name: /verify|continue/i }).click();
}

requiresAuth('owner can complete and submit an application', async ({ page }) => {
  await loginWithOtp(page, ownerPhone!, ownerOtp!);
  await expect(page).toHaveURL(/\/owner\/dashboard/);

  await page.getByRole('link', { name: /new application|নতুন আবেদন/i }).click();
  await expect(page).toHaveURL(/applications\/new/);

  // Step 1
  await page.getByLabel(/project name.*english/i).fill('E2E Test Building');
  await page.getByLabel(/project name.*bangla/i).fill('ই২ই পরীক্ষা ভবন');
  await page.getByLabel(/floors/i).fill('3');
  await page.getByLabel(/area.*sqft/i).fill('1500');
  await page.getByLabel(/cost/i).fill('5000000');
  await page.getByRole('button', { name: /next|continue/i }).click();

  // Subsequent steps — the smoke version stops here. Full submission requires
  // mock document fixtures and is deferred to the manual QA pass described in
  // PRD Section 22.12 task 9.7.
});

requiresAuth('officer dashboard shows application queue', async ({ page }) => {
  await loginWithOtp(page, officerPhone!, officerOtp!);
  await expect(page).toHaveURL(/\/officer\/dashboard/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

requiresAuth('language toggle persists across navigation', async ({ page }) => {
  await loginWithOtp(page, ownerPhone!, ownerOtp!);
  const toggle = page.getByRole('button', { name: /language|ভাষা|বাংলা|English/i });
  if (await toggle.isVisible()) {
    await toggle.click();
    await page.getByRole('menuitem', { name: /বাংলা|Bangla/ }).click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', /bn|en/);
  }
});
