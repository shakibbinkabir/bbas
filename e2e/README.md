# BBAS End-to-End Tests

These tests use Playwright to drive the app through a real browser.

## Setup

1. Install the Playwright test runner (it is intentionally not in
   `package.json` so the production install stays lean):

   ```bash
   npm install --save-dev @playwright/test
   npx playwright install --with-deps chromium
   ```

2. Provision a Supabase test project with seed data (owners, officers,
   admin, authorities, a few draft applications). The migrations under
   `supabase/migrations` are the source of truth.

3. Set the following environment variables in `.env.test.local`:

   ```
   E2E_BASE_URL=http://localhost:3000
   E2E_OWNER_PHONE=01700000001
   E2E_OWNER_OTP=123456
   E2E_OFFICER_PHONE=01700000002
   E2E_OFFICER_OTP=123456
   E2E_ADMIN_PHONE=01700000003
   E2E_ADMIN_OTP=123456
   ```

   (Use a Supabase test project where OTP is fixed for the test user — the
   service-key seeding script that ships with Stage 9 sets these up.)

## Running

```bash
npx playwright test               # all tests, headless
npx playwright test --headed      # with browser UI
npx playwright test smoke.spec    # smoke tests only
npx playwright show-report        # open the HTML report
```

## Layout

- `smoke.spec.ts` — public surface, auth gates. Always runs.
- `journeys.spec.ts` — full owner / officer / admin journeys. Auto-skipped
  when E2E credentials are not configured.
