/*
  Warnings:

  - Added the required column `subtotal` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Coupon" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "expiresAt" DATETIME,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "total" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "stripeTransactionId" TEXT,
    "couponCode" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_couponCode_fkey" FOREIGN KEY ("couponCode") REFERENCES "Coupon" ("code") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("address", "city", "country", "createdAt", "email", "firstName", "id", "lastName", "state", "status", "stripePaymentIntentId", "stripeTransactionId", "total", "updatedAt", "zipCode") SELECT "address", "city", "country", "createdAt", "email", "firstName", "id", "lastName", "state", "status", "stripePaymentIntentId", "stripeTransactionId", "total", "updatedAt", "zipCode" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order"("stripePaymentIntentId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_stripePaymentIntentId_idx" ON "Order"("stripePaymentIntentId");
CREATE INDEX "Order_email_idx" ON "Order"("email");
CREATE INDEX "Order_couponCode_idx" ON "Order"("couponCode");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "Coupon"("isActive");

-- CreateIndex
CREATE INDEX "Coupon_expiresAt_idx" ON "Coupon"("expiresAt");
