import mongoose, { Document, Schema } from "mongoose";

export interface RefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
  replacedBy?: string;  // Token rotation tracking
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginAttempt {
  timestamp: Date;
  ipAddress: string;
  userAgent?: string;
  successful: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin" | "seller" | "user";
  
  // Refresh Token Rotation
  refreshTokens: RefreshToken[];
  
  // Brute-Force Protection
  loginAttempts: LoginAttempt[];
  lockUntil?: Date;
  
  // Account Security
  passwordChangedAt?: Date;
  accountLocked: boolean;
  
  // Helper Methods
  isLocked(): boolean;
  incrementLoginAttempts(ipAddress: string, userAgent: string): Promise<void>;
  resetLoginAttempts(): Promise<void>;
  addRefreshToken(token: string, ipAddress?: string, userAgent?: string): Promise<void>;
  revokeRefreshToken(token: string, replacedBy?: string): Promise<void>;
  removeExpiredRefreshTokens(): Promise<void>;
}

const refreshTokenSchema = new Schema({
  token: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date },
  replacedBy: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
}, { _id: false });

const loginAttemptSchema = new Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, required: true },
  userAgent: { type: String },
  successful: { type: Boolean, required: true },
}, { _id: false });

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "seller", "user"],
      default: "user",
    },
    
    // Refresh Token Rotation
    refreshTokens: { type: [refreshTokenSchema], default: [] },
    
    // Brute-Force Protection
    loginAttempts: { type: [loginAttemptSchema], default: [] },
    lockUntil: { type: Date },
    
    // Account Security
    passwordChangedAt: { type: Date },
    accountLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ "refreshTokens.token": 1 });
userSchema.index({ lockUntil: 1 }, { sparse: true });

// Constants for brute-force protection
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW = 10 * 60 * 1000; // 10 minutes

// Virtual for lock status
userSchema.virtual("isLockedOut").get(function(this: IUser) {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Check if account is locked
userSchema.methods.isLocked = function(this: IUser): boolean {
  if (this.accountLocked) return true;
  if (this.lockUntil && this.lockUntil > new Date()) return true;
  return false;
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = async function(
  this: IUser,
  ipAddress: string,
  userAgent: string
): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - ATTEMPT_WINDOW);
  
  // Filter attempts within window
  this.loginAttempts = this.loginAttempts.filter(
    (attempt) => attempt.timestamp > windowStart
  );
  
  // Add new failed attempt
  this.loginAttempts.push({
    timestamp: now,
    ipAddress,
    userAgent,
    successful: false,
  });
  
  // Count recent failed attempts
  const recentFailed = this.loginAttempts.filter(
    (attempt) => !attempt.successful && attempt.timestamp > windowStart
  ).length;
  
  // Lock if exceeded max attempts
  if (recentFailed >= MAX_LOGIN_ATTEMPTS) {
    this.lockUntil = new Date(now.getTime() + LOCK_DURATION);
  }
  
  await this.save();
};

// Reset login attempts on successful login
userSchema.methods.resetLoginAttempts = async function(this: IUser): Promise<void> {
  const now = new Date();
  const ipAddress = "unknown"; // Will be set by caller
  
  this.loginAttempts.push({
    timestamp: now,
    ipAddress,
    userAgent: "",
    successful: true,
  });
  
  this.lockUntil = undefined;
  await this.save();
};

// Add refresh token
userSchema.methods.addRefreshToken = async function(
  this: IUser,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
  
  this.refreshTokens.push({
    token,
    expiresAt,
    createdAt: new Date(),
    ipAddress,
    userAgent,
  });
  
  // Keep only last 5 refresh tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
  
  await this.save();
};

// Revoke refresh token (rotation)
userSchema.methods.revokeRefreshToken = async function(
  this: IUser,
  token: string,
  replacedBy?: string
): Promise<void> {
  const refreshToken = this.refreshTokens.find((rt) => rt.token === token);
  if (refreshToken) {
    refreshToken.revokedAt = new Date();
    refreshToken.replacedBy = replacedBy;
    await this.save();
  }
};

// Remove expired tokens
userSchema.methods.removeExpiredRefreshTokens = async function(this: IUser): Promise<void> {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(
    (rt) => rt.expiresAt > now
  );
  await this.save();
};

export default mongoose.model<IUser>("User", userSchema);
