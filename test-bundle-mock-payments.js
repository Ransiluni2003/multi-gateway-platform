// Quick Test Script for Bundle Products + Mock Payments
// Run: node test-bundle-mock-payments.js

const BASE_URL = "http://localhost:5000";

async function testAPI() {
  console.log("🧪 Testing Bundle Products + Mock Payments API\n");

  let bundleId = "";
  let transactionId = "";

  // Test 1: Create Bundle
  try {
    console.log("1️⃣ Creating bundle...");
    const bundleResponse = await fetch(`${BASE_URL}/api/bundles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Starter Pack",
        description: "Test bundle for API testing",
        items: [
          {
            productId: "prod_123",
            productName: "Widget A",
            quantity: 2,
            unitPrice: 19.99,
          },
          {
            productId: "prod_456",
            productName: "Widget B",
            quantity: 1,
            unitPrice: 39.99,
          },
        ],
        discounts: [
          {
            discountType: "percentage",
            discountValue: 10,
            priority: 1,
          },
        ],
      }),
    });

    const bundle = await bundleResponse.json();
    bundleId = bundle.id;
    console.log(`   ✅ Bundle created: ${bundleId}`);
    console.log(`   💰 Total: $${bundle.pricing.total.toFixed(2)}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 2: Get Bundle Details
  try {
    console.log("2️⃣ Getting bundle details...");
    const response = await fetch(`${BASE_URL}/api/bundles/${bundleId}`);
    const bundle = await response.json();
    console.log(`   ✅ Bundle: ${bundle.name}`);
    console.log(`   📦 Items: ${bundle.items.length}`);
    console.log(`   🎟️  Discounts: ${bundle.discounts.length}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 3: Authorize Payment (Success)
  try {
    console.log("3️⃣ Authorizing payment (success card)...");
    const response = await fetch(`${BASE_URL}/api/payments/mock/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 69.11,
        currency: "USD",
        payment_method: {
          card_number: "4242424242424242",
          exp_month: "12",
          exp_year: "2027",
          cvv: "123",
        },
        orderId: "test_order_123",
        metadata: {
          bundle_id: bundleId,
        },
      }),
    });

    const result = await response.json();
    if (result.success) {
      transactionId = result.transaction_id;
      console.log(`   ✅ Payment authorized: ${transactionId}`);
      console.log(`   💳 Amount: $${result.amount}\n`);
    } else {
      console.log(`   ❌ Authorization failed: ${result.error_message}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 4: Get Transaction Details
  try {
    console.log("4️⃣ Getting transaction details...");
    const response = await fetch(
      `${BASE_URL}/api/payments/mock/transactions/${transactionId}`
    );
    const txn = await response.json();
    console.log(`   ✅ Transaction: ${txn.transaction_id}`);
    console.log(`   📊 Status: ${txn.status}`);
    console.log(`   📅 Events: ${txn.events.length}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 5: Capture Payment
  try {
    console.log("5️⃣ Capturing payment...");
    const response = await fetch(`${BASE_URL}/api/payments/mock/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: transactionId,
        amount: 69.11,
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log(`   ✅ Payment captured: ${result.transaction_id}`);
      console.log(`   💰 Amount: $${result.amount}\n`);
    } else {
      console.log(`   ❌ Capture failed: ${result.message}\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 6: Test Card Decline
  try {
    console.log("6️⃣ Testing card decline...");
    const response = await fetch(`${BASE_URL}/api/payments/mock/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 50.0,
        currency: "USD",
        payment_method: {
          card_number: "4000000000000002",
          exp_month: "12",
          exp_year: "2027",
          cvv: "123",
        },
        orderId: "test_order_456",
      }),
    });

    const result = await response.json();
    if (!result.success) {
      console.log(`   ✅ Card declined as expected`);
      console.log(`   ❌ Error: ${result.error_code} - ${result.error_message}\n`);
    } else {
      console.log(`   ⚠️  Expected decline but got success\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // Test 7: List Transactions
  try {
    console.log("7️⃣ Listing transactions...");
    const response = await fetch(
      `${BASE_URL}/api/payments/mock/transactions?limit=10`
    );
    const data = await response.json();
    console.log(`   ✅ Total transactions: ${data.total}`);
    console.log(`   📋 Fetched: ${data.transactions.length}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log("✅ All tests completed!");
  console.log("\n📝 Next steps:");
  console.log("   1. Import Postman collection: Bundle-Mock-Payments.postman_collection.json");
  console.log("   2. Visit admin UI: http://localhost:3001/admin/transactions");
  console.log("   3. Record Loom demo (2 minutes)");
}

// Run tests
testAPI().catch(console.error);
