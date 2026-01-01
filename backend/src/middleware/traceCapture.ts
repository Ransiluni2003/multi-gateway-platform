import { Request, Response, NextFunction } from "express";
import TraceModel from "../models/Trace";

export function traceCapture(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const id = (req.headers["x-tarce-id"] as string) || (req.headers['x-trace-id'] as string) || Math.random().toString(36).slice(2);
    res.on("finish", async () => {
        const durationMs = Date.now() - start;
        const serviceName = (req.headers['x-service-name'] as string) || process.env.SERVICE_NAME || 'api';
        const traceDoc = {
            id,
            path: req.originalUrl,
            method: req.method,
            status: res.statusCode,
            durationMs,
            ts: new Date().toISOString(),
            serviceName,
        }; 
        try {
            await TraceModel.create(traceDoc);
        } catch (err) {
            // Optionally log error, but don't block response
            // console.error('Failed to save trace:', err);
        }
    });
    next();
}