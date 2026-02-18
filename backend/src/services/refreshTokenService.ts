// services/refreshTokenService.ts
/**
 * Refresh Token Rotation Service
 * Implements secure token rotation with revocation tracking
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import logger from "../utils/logger";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string; // Unique ID for this token
  type: "refresh";
}

export class RefreshTokenService {
  private static readonly ACCESS_TOKEN_EXPIRY = "15m"; // Short-lived
  private static readonly REFRESH_TOKEN_EXPIRY = "30d"; // Long-lived

  /**
   * Generate access token (JWT)
   */
  static generateAccessToken(userId: string, role: IUser["role"]): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");

    return jwt.sign(
      { id: userId, role, type: "access" },
      secret,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );
  }

  /**
   * Generate refresh token (opaque token)
   */
  static generateRefreshToken(userId: string): string {
    // Opaque token: userId + random + timestamp
    const tokenId = crypto.randomBytes(32).toString("hex");
    const timestamp = Date.now();
    const payload = `${userId}:${tokenId}:${timestamp}`;
    
    // Sign with HMAC
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET not configured");
    
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payload);
    const signature = hmac.digest("hex");
    
    // Format: payload.signature
    return `${Buffer.from(payload).toString("base64")}.${signature}`;
  }

  /**
   * Verify refresh token signature and decode
   */
  static verifyRefreshToken(token: string): { userId: string; tokenId: string } | null {
    try {
      const [payloadB64, signature] = token.split(".");
      if (!payloadB64 || !signature) return null;

      const payload = Buffer.from(payloadB64, "base64").toString();
      
      // Verify signature
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET not configured");
      
      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(payload);
      const expectedSignature = hmac.digest("hex");
      
      if (signature !== expectedSignature) {
        logger.warn("Refresh token signature mismatch");
        return null;
      }

      const [userId, tokenId] = payload.split(":");
      return { userId, tokenId };
    } catch (error) {
      logger.error("Refresh token verification error", error);
      return null;
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  static async generateTokenPair(
    userId: string,
    role: IUser["role"],
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair> {
    const accessToken = this.generateAccessToken(userId, role);
    const refreshToken = this.generateRefreshToken(userId);

    // Store refresh token in database
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    await user.addRefreshToken(refreshToken, ipAddress, userAgent);

    logger.info("Token pair generated", { userId, ipAddress });

    return { accessToken, refreshToken };
  }

  /**
   * Rotate refresh token (use old, get new)
   */
  static async rotateRefreshToken(
    oldRefreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<TokenPair | null> {
    const decoded = this.verifyRefreshToken(oldRefreshToken);
    if (!decoded) {
      logger.warn("Invalid refresh token format");
      return null;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      logger.warn("User not found for refresh token");
      return null;
    }

    // Check if token exists and is not revoked
    const tokenRecord = user.refreshTokens.find(
      (rt) => rt.token === oldRefreshToken
    );

    if (!tokenRecord) {
      logger.warn("Refresh token not found in database", { userId: user._id });
      return null;
    }

    if (tokenRecord.revokedAt) {
      // Possible token reuse attack - revoke all tokens
      logger.error("Revoked refresh token reused - possible attack", {
        userId: user._id,
        ipAddress,
      });
      
      user.refreshTokens = user.refreshTokens.map((rt) => ({
        ...rt,
        revokedAt: rt.revokedAt || new Date(),
      }));
      await user.save();
      
      return null;
    }

    if (tokenRecord.expiresAt < new Date()) {
      logger.warn("Refresh token expired", { userId: user._id });
      return null;
    }

    // Generate new token pair
    const newTokenPair = await this.generateTokenPair(
      user._id.toString(),
      user.role,
      ipAddress,
      userAgent
    );

    // Revoke old token (rotation)
    await user.revokeRefreshToken(oldRefreshToken, newTokenPair.refreshToken);

    logger.info("Refresh token rotated", {
      userId: user._id,
      ipAddress,
    });

    return newTokenPair;
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  static async revokeAllTokens(userId: string): Promise<void> {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    user.refreshTokens = user.refreshTokens.map((rt) => ({
      ...rt,
      revokedAt: rt.revokedAt || new Date(),
    }));

    await user.save();

    logger.info("All refresh tokens revoked", { userId });
  }

  /**
   * Cleanup expired tokens (run periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    let count = 0;

    const users = await User.find({
      "refreshTokens.expiresAt": { $lt: now },
    });

    for (const user of users) {
      const before = user.refreshTokens.length;
      await user.removeExpiredRefreshTokens();
      const after = user.refreshTokens.length;
      count += before - after;
    }

    if (count > 0) {
      logger.info("Expired refresh tokens cleaned up", { count });
    }

    return count;
  }
}
