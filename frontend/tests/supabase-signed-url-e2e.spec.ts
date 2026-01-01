import { test, expect } from '@playwright/test';

// This test simulates the signed-URL expiry and refresh logic for SupabaseDownloadButton
// It stubs the API to return 401/InvalidJWT on first attempt, then success on refresh

test.describe('Supabase Signed-URL Expiry Handling', () => {
  test('handles expired URL, refresh, and final fail', async ({ page }) => {
    // Intercept the download-url API to simulate expiry on first call
    let callCount = 0;
    await page.route('/api/files/download-url*', async (route) => {
      callCount++;
      if (callCount === 1) {
        // Simulate expired/invalid JWT
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'InvalidJWT: Signature has expired' })
        });
      } else {
        // Simulate success on refresh
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ downloadUrl: 'https://example.com/fakefile', expiresAt: Date.now() + 60000 })
        });
      }
    });

    // Intercept the proxy download to simulate a final failure
    await page.route('/api/files/download*', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Signature mismatch' })
      });
    });

    // Go to the page with the SupabaseDownloadButton (adjust path as needed)
    await page.goto('/files');

    // Click the download button
    await page.getByRole('button', { name: /download/i }).click();

    // Expect a toast about retrying
    await expect(page.getByText(/retrying/i)).toBeVisible();

    // Expect a toast about final failure
    await expect(page.getByText(/download failed|expired|signature/i)).toBeVisible();

    // Optionally, check that error log API was called (if you mock/fake it)
  });
});
