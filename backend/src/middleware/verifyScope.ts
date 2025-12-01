// src/middleware/verifyScope.ts
import { Request, Response, NextFunction } from "express";

interface IUser {
  id: string;
  email: string;
  scope?: string; // <-- add optional scope
}

export const verifyScope = (required: string) => {
  return (req: Request & { user?: IUser }, res: Response, next: NextFunction) => {
    if (!req.user || req.user.scope !== required) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};
