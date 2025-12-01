// @ts-nocheck - jwt typings vary across versions; narrow runtime checks are used below
import { Request, Response, NextFunction } from "express";
const jwt: any = require("jsonwebtoken");
import User, { IUser } from "../models/User";
import logger from "../utils/logger";

export interface AuthRequest extends Request {
  user?: IUser;
}

interface TokenPayload {
  id?: string;
  sub?: string;
  role?: IUser["role"];
  iat?: number;
  exp?: number;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("No Authorization header present");
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error("JWT_SECRET is not configured");
    return res.status(500).json({ message: "Server configuration error" });
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload | string;

    // jwt.verify can return string for legacy tokens — ensure object
    if (typeof decoded === "string") {
      logger.warn("JWT verify returned unexpected string payload");
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const id = decoded.id || decoded.sub;
    if (!id || typeof id !== "string") {
      logger.warn("JWT payload missing id/sub");
      return res.status(401).json({ message: "Invalid token payload" });
    }

    const user = await User.findById(id).select("-password").lean<IUser>();
    if (!user) {
      logger.warn(`Authenticated user not found: ${id}`);
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err: any) {
    logger.error("JWT verify error", { error: err?.message || err });
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorizeRoles = (...roles: Array<IUser["role"] | string>) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn("Access denied - insufficient role", { required: roles, userRole: req.user?.role });
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
