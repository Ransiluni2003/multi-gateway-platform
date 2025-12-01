// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

interface ErrorWithStatus extends Error {
  status?: number;
}

const errorHandler = (err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";
  // Log server side (in prod use logger)
  if (statusCode === 500) console.error(err);
  res.status(statusCode).json({ message });
};

export default errorHandler;
