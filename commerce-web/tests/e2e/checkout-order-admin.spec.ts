import { test, expect } from '@playwright/test';
import crypto from 'crypto';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';

function generateStripeSignature(payload: string, secret: string) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

test.describe('Full Checkout → Order → Admin Flow', () => {
  test('customer adds product, checkout; webhooks update admin UI (success, failure, refund)', async ({ page, request }) => {
    // 1) Create product via API so UI has a predictable item
    const productResp = await request.post(`${BASE}/api/products`, {
      data: {
        name: 'E2E Test Product',
        price: 1999,
        description: 'Playwright E2E product',
        images: [],
        stock: 10,
        status: 'active',
      },
    });
    expect(productResp.ok()).toBeTruthy();
    const product = await productResp.json();

    // 2) Customer: visit product page and add to cart
    await page.goto(`${BASE}/products/${product.id}`);
    await page.waitForSelector('text=Add to Cart');
    await page.getByRole('spinbutton', { name: 'Quantity', exact: false }).fill('1').catch(() => null);
    await page.getByRole('button', { name: 'Add to Cart' }).click();

    // 3) Go to cart and proceed to checkout
    await page.goto(`${BASE}/cart`);
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();

    // 4) Fill checkout form to create an order
    await page.waitForURL('**/checkout**');
    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('Tester');
    await page.getByLabel('Email').fill('e2e@example.test');
    await page.getByLabel('Address').fill('123 Test St');
    await page.getByLabel('City').fill('Testville');
    await page.getByLabel('State').fill('TS');
    await page.getByLabel('ZIP Code').fill('12345');
    await page.getByLabel('Country').fill('US');

    // Submit to create order (this redirects to /checkout/success?orderId=...)
    await Promise.all([
      page.waitForNavigation({ url: /\/checkout\/success\?orderId=/ }),
      page.getByRole('button', { name: /Place Order|Continue to Payment/i }).click(),
    ]);

    const url = new URL(page.url());
    const orderId = url.searchParams.get('orderId');
    expect(orderId).toBeTruthy();

    // Helper to create payment intent server-side (same as frontend flow)
    async function createPaymentIntentFor(orderId: string) {
      const resp = await request.post(`${BASE}/api/payment-intent`, {
        data: {
          orderId,
          amount: 19.99 * 100, // cents
          email: 'e2e@example.test',
        },
      });
      expect(resp.ok()).toBeTruthy();
      return resp.json();
    }

    // Ensure webhook secret is available in environment for signing
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      test.skip(true, 'STRIPE_WEBHOOK_SECRET not set in environment');
      return;
    }

    // 5) Simulate successful payment via signed webhook
    const pi = await createPaymentIntentFor(orderId as string);
    const paymentIntentId = pi.paymentIntentId || pi.paymentIntentId;
    expect(paymentIntentId).toBeTruthy();

    const successEvent = {
      id: `evt_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          metadata: { orderId },
          latest_charge: 'ch_test_success_1',
        },
      },
    };

    const payload = JSON.stringify(successEvent);
    const sigHeader = generateStripeSignature(payload, webhookSecret);

    const webhookResp = await request.post(`${BASE}/api/webhooks/stripe`, {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sigHeader,
      },
    });
    expect(webhookResp.ok()).toBeTruthy();

    // 6) Switch to admin and verify order now shows completed and charge id saved
    await page.goto(`${BASE}/admin/orders`);
    await page.waitForSelector('text=Orders');

    // Find the order row by orderId and check status text
    const orderRow = page.locator(`text=${orderId}`).first();
    await expect(orderRow).toBeVisible();
    await expect(orderRow.locator('text=completed', { exact: false })).toBeVisible();
    // Expect displayed charge id somewhere in row or details
    await expect(page.locator(`text=ch_test_success_1`)).toBeVisible();

    // 7) Now simulate a failed payment for a new order
    // create a second order by repeating the UI flow quickly
    // Add the product again
    await page.goto(`${BASE}/products/${product.id}`);
    await page.getByRole('button', { name: 'Add to Cart' }).click();
    await page.goto(`${BASE}/cart`);
    await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('Failure');
    await page.getByLabel('Email').fill('fail@example.test');
    await page.getByLabel('Address').fill('1 Fail St');
    await page.getByLabel('City').fill('Failtown');
    await page.getByLabel('State').fill('FL');
    await page.getByLabel('ZIP Code').fill('00000');
    await page.getByLabel('Country').fill('US');

    await Promise.all([
      page.waitForNavigation({ url: /\/checkout\/success\?orderId=/ }),
      page.getByRole('button', { name: /Place Order|Continue to Payment/i }).click(),
    ]);

    const url2 = new URL(page.url());
    const orderId2 = url2.searchParams.get('orderId');
    expect(orderId2).toBeTruthy();

    const pi2 = await createPaymentIntentFor(orderId2 as string);
    const paymentIntentId2 = pi2.paymentIntentId;

    const failedEvent = {
      id: `evt_${Date.now()}_fail`,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentId2,
          metadata: { orderId: orderId2 },
        },
      },
    };

    const payloadFail = JSON.stringify(failedEvent);
    const sigFail = generateStripeSignature(payloadFail, webhookSecret);

    const webhookFailResp = await request.post(`${BASE}/api/webhooks/stripe`, {
      data: payloadFail,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sigFail,
      },
    });
    expect(webhookFailResp.ok()).toBeTruthy();

    // Verify admin shows failed status for second order
    await page.goto(`${BASE}/admin/orders`);
    await page.waitForSelector('text=Orders');
    const row2 = page.locator(`text=${orderId2}`).first();
    await expect(row2).toBeVisible();
    await expect(row2.locator('text=failed', { exact: false })).toBeVisible();

    // 8) Trigger a refund event for the first order (uses charge id set earlier)
    const refundEvent = {
      id: `evt_${Date.now()}_refund`,
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_success_1',
          amount_refunded: 1999,
          metadata: { orderId },
        },
      },
    };

    const payloadRefund = JSON.stringify(refundEvent);
    const sigRefund = generateStripeSignature(payloadRefund, webhookSecret);

    const webhookRefundResp = await request.post(`${BASE}/api/webhooks/stripe`, {
      data: payloadRefund,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sigRefund,
      },
    });
    expect(webhookRefundResp.ok()).toBeTruthy();

    // Verify admin shows refunded status
    await page.goto(`${BASE}/admin/orders`);
    await page.waitForSelector('text=Orders');
    await expect(page.locator(`text=${orderId}`).first().locator('text=refunded', { exact: false })).toBeVisible();
  });
});
