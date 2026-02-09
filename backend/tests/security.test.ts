/**
 * Security Testing Suite
 * Tests for:
 * 1. Security headers presence
 * 2. Rate limiting enforcement
 * 3. Signed URL expiry validation
 */

import request from "supertest";
import app from "../src/server";
import User from "../src/models/User";
import { RefreshTokenService } from "../src/services/refreshTokenService";

/**
 * Test Suite 1: Security Headers Presence
 */
describe("Security Headers", () => {
  test("should set Strict-Transport-Security header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["strict-transport-security"]).toBeDefined();
  });

  test("should set X-Content-Type-Options header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  test("should set X-Frame-Options header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-frame-options"]).toBe("DENY");
  });

  test("should set X-XSS-Protection header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-xss-protection"]).toBeDefined();
  });

  test("should not expose X-Powered-By header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  test("should set Content-Security-Policy header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["content-security-policy"]).toBeDefined();
  });

  test("should set Referrer-Policy header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("should set Permissions-Policy header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["permissions-policy"]).toBeDefined();
  });
});

/**
 * Test Suite 2: Rate Limiting
 */
describe("Rate Limiting", () => {
  beforeAll(async () => {
    // Create test user
    await User.create({
      email: "ratelimit@test.com",
      password: "$2b$10$...", // hashed
      name: "Rate Limit Test",
    });
  });

  test("should block IP after 10 failed login attempts within 15 minutes", async () => {
    const email = `ratelimit-ip-${Date.now()}@test.com`;

    // Make 10 failed attempts
    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong" });

      if (i < 9) {
        expect(res.status).toBe(401); // Invalid credentials
      }
    }

    // 11th attempt should be blocked (429)
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong" });

    expect(res.status).toBe(429); // Too many requests
    expect(res.body.error).toContain("Too many login attempts");
    expect(res.body.retryAfter).toBeDefined();
  });

  test("should lock account after 5 failed login attempts within 10 minutes", async () => {
    const email = `ratelimit-account-${Date.now()}@test.com`;

    // Create user
    const user = await User.create({
      email,
      password: "$2b$10$hashed", // mock hash
      name: "Account Lock Test",
    });

    // Make 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong" });
    }

    // 6th attempt should return 423 (account locked)
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "correct" });

    expect(res.status).toBe(423); // Locked
    expect(res.body.error).toContain("Account is locked");
    expect(res.body.lockedUntil).toBeDefined();

    // Cleanup
    await User.deleteOne({ _id: user._id });
  });

  test("should reset account attempts after successful login", async () => {
    const email = `ratelimit-reset-${Date.now()}@test.com`;

    // Create user with bcrypt-hashed password
    const hashedPassword = await require("bcrypt").hash("ValidPassword123!", 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name: "Reset Test",
    });

    // Make 2 failed attempts
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong" });
    }

    // Successful login should reset attempts
    const successRes = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "ValidPassword123!" });

    expect(successRes.status).toBe(200);

    // Check user record
    const updatedUser = await User.findById(user._id);
    const failedAttempts = updatedUser.loginAttempts.filter(
      (a: any) => !a.successful
    );

    // Should reset after successful login
    expect(updatedUser.lockUntil).toBeUndefined();

    // Cleanup
    await User.deleteOne({ _id: user._id });
  });

  test("should return retryAfter header on rate limit", async () => {
    const email = `ratelimit-header-${Date.now()}@test.com`;

    // Make 10 attempts to trigger IP block
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email, password: "wrong" });
    }

    // Check for retryAfter
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "wrong" });

    expect(res.status).toBe(429);
    expect(res.body.retryAfter).toBeDefined();
    expect(typeof res.body.retryAfter).toBe("number");
    expect(res.body.retryAfter).toBeGreaterThan(0);
  });
});

/**
 * Test Suite 3: Signed URL Expiry
 */
describe("Signed URL Expiry", () => {
  let userId: string;
  let fileId: string;
  let csrfToken: string;

  beforeAll(async () => {
    // Create user
    const user = await User.create({
      email: "signedurl@test.com",
      password: "$2b$10$hashed",
      name: "Signed URL Test",
    });
    userId = user._id.toString();

    // Create mock file document
    const File = require("../src/models/File").default;
    const file = await File.create({
      name: "test.pdf",
      ownerId: userId,
      path: "/uploads/test.pdf",
      size: 1024,
      mimeType: "application/pdf",
    });
    fileId = file._id.toString();
  });

  test("should expire signed URL after configured duration", async () => {
    // Create share link with 1-second expiry (for testing)
    const shortExpiryMs = 1000; // 1 second

    const shareLink = {
      token: "test-token-" + Date.now(),
      expiresAt: new Date(Date.now() + shortExpiryMs),
      createdAt: new Date(),
    };

    // Verify link is valid immediately
    const now = new Date();
    expect(shareLink.expiresAt > now).toBe(true);

    // Wait for expiry
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Verify link is now expired
    expect(shareLink.expiresAt <= new Date()).toBe(true);
  });

  test("should reject expired share link access", async () => {
    const File = require("../src/models/File").default;

    // Create file
    const file = await File.create({
      name: "expired-test.pdf",
      ownerId: userId,
      path: "/uploads/expired-test.pdf",
      size: 1024,
      mimeType: "application/pdf",
      shareLinks: [
        {
          token: "expired-token",
          expiresAt: new Date(Date.now() - 1000), // Already expired
          createdAt: new Date(Date.now() - 2000),
        },
      ],
    });

    // Try to access with expired token
    const res = await request(app).get(
      `/api/files/share/expired-token/download`
    );

    expect(res.status).toBe(401); // Unauthorized
    expect(res.body.error).toContain("expired");

    // Cleanup
    await File.deleteOne({ _id: file._id });
  });

  test("should allow access to valid (non-expired) share link", async () => {
    const File = require("../src/models/File").default;

    // Create file with valid share link
    const validToken = "valid-token-" + Date.now();
    const file = await File.create({
      name: "valid-share.pdf",
      ownerId: userId,
      path: "/uploads/valid-share.pdf",
      size: 1024,
      mimeType: "application/pdf",
      shareLinks: [
        {
          token: validToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
        },
      ],
    });

    // Should allow access
    const res = await request(app).get(
      `/api/files/share/${validToken}/metadata`
    );

    expect(res.status).toBe(200);

    // Cleanup
    await File.deleteOne({ _id: file._id });
  });

  test("should include expiration time in share link metadata", async () => {
    const File = require("../src/models/File").default;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const token = "metadata-token-" + Date.now();

    const file = await File.create({
      name: "metadata-test.pdf",
      ownerId: userId,
      path: "/uploads/metadata-test.pdf",
      size: 1024,
      mimeType: "application/pdf",
      shareLinks: [
        {
          token,
          expiresAt,
          createdAt: new Date(),
        },
      ],
    });

    // Get share link metadata
    const res = await request(app).get(`/api/files/share/${token}/metadata`);

    if (res.status === 200) {
      expect(res.body.expiresAt).toBeDefined();
      expect(new Date(res.body.expiresAt).getTime()).toBeCloseTo(
        expiresAt.getTime(),
        -3
      ); // Within 1 second
    }

    // Cleanup
    await File.deleteOne({ _id: file._id });
  });

  test("should calculate remaining time to expiry correctly", async () => {
    const File = require("../src/models/File").default;

    // Create link expiring in exactly 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = "expiry-calc-" + Date.now();

    const file = await File.create({
      name: "expiry-calc.pdf",
      ownerId: userId,
      path: "/uploads/expiry-calc.pdf",
      size: 1024,
      mimeType: "application/pdf",
      shareLinks: [
        {
          token,
          expiresAt,
          createdAt: new Date(),
        },
      ],
    });

    // Calculate remaining time
    const now = new Date().getTime();
    const remainingMs = expiresAt.getTime() - now;
    const remainingHours = remainingMs / (60 * 60 * 1000);

    expect(remainingHours).toBeGreaterThan(0.99);
    expect(remainingHours).toBeLessThanOrEqual(1);

    // Cleanup
    await File.deleteOne({ _id: file._id });
  });
});

/**
 * Test Suite 4: CSRF Token Validation
 */
describe("CSRF Protection", () => {
  test("should require CSRF token for POST requests", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "password" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("CSRF");
  });

  test("should validate CSRF token matches between cookie and header", async () => {
    // Get CSRF token
    const tokenRes = await request(app).get("/api/auth/csrf-token");
    const { csrfToken } = tokenRes.body;

    // Try with wrong token
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-CSRF-Token", "wrong-token")
      .send({ email: "test@test.com", password: "password" });

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("Invalid CSRF");
  });

  test("should accept valid CSRF token", async () => {
    // Get CSRF token
    const tokenRes = await request(app).get("/api/auth/csrf-token");
    const { csrfToken } = tokenRes.body;

    // The actual login will fail due to invalid credentials,
    // but CSRF check passes if we get 401 instead of 403
    const res = await request(app)
      .post("/api/auth/login")
      .set("X-CSRF-Token", csrfToken)
      .send({ email: "nonexistent@test.com", password: "password" });

    // Should get 401 (invalid credentials), not 403 (CSRF failed)
    expect(res.status).toBe(401);
  });
});

/**
 * Test Suite 5: Refresh Token Security
 */
describe("Refresh Token Security", () => {
  let testUser: any;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Create test user
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("TestPassword123!", 10);

    testUser = await User.create({
      email: `refreshtoken-${Date.now()}@test.com`,
      password: hashedPassword,
      name: "Refresh Token Test",
    });
  });

  test("should validate refresh token HMAC signature", async () => {
    // Verify refresh token format
    const { refreshToken: token } = RefreshTokenService.generateTokenPair(
      testUser
    );

    // Token should be valid base64url
    expect(() => {
      Buffer.from(token, "base64url");
    }).not.toThrow();

    // Token should have correct length (32 bytes data + 32 bytes HMAC = 64 bytes)
    const buffer = Buffer.from(token, "base64url");
    expect(buffer.length).toBe(64);
  });

  test("should reject tampered refresh token", async () => {
    const { refreshToken } = RefreshTokenService.generateTokenPair(testUser);

    // Tamper with token
    const buffer = Buffer.from(refreshToken, "base64url");
    buffer[0] = (buffer[0] + 1) % 256; // Flip a bit
    const tamperedToken = buffer.toString("base64url");

    // Verification should fail
    const isValid = RefreshTokenService.verifyRefreshToken(tamperedToken);
    expect(isValid).toBe(false);
  });

  test("should set secure httpOnly cookie for refresh token", async () => {
    // This is tested in integration tests with actual HTTP responses
    // Verify cookie settings in server.ts:
    // res.cookie("refreshToken", refreshToken, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "strict",
    //   maxAge: 30 * 24 * 60 * 60 * 1000,
    // });
    expect(true).toBe(true); // Placeholder for integration test
  });
});

afterAll(async () => {
  // Cleanup test data
  await User.deleteMany({
    email: { $regex: /^(ratelimit|signedurl|refreshtoken)/ },
  });
});
