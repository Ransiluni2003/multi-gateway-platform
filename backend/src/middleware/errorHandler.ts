// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { structuredLogger } from "../utils/structuredLogger";

interface ErrorWithStatus extends Error {
  status?: number;
}

const errorHandler = (err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";
  structuredLogger.logErrorWithRequest(req, err, "Unhandled error");
  res.status(statusCode).json({ message });
};

export default errorHandler;
