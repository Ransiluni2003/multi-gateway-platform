import {Request,Response ,NextFunction} from "express";

type Trace ={
    id: string;
    path: string;
    method: string;
    status?: number;
    durationMs?: number;
    ts: string;
    serviceName?: string;
};

const traces : Trace[] = [];

export function traceCapture(req:Request,res:Response, next: NextFunction) {
    const start = Date.now();
    const id = (req.headers["x-tarce-id"]as string) || (req.headers['x-trace-id'] as string) || Math.random().toString(36).slice(2);
    res.on("finish", () => {
        const durationMs = Date.now() - start;
        const serviceName = (req.headers['x-service-name'] as string) || process.env.SERVICE_NAME || 'api';

        traces.unshift({
            id,
            path: req.originalUrl,
            method: req.method,
            status: res.statusCode,
            durationMs,
            ts: new Date().toISOString(),
            serviceName,
    });
    if(traces.length > 200) traces.pop();
});
next();
}
 
export function getRecentTraces(limit = 10) {
    return traces.slice(0, limit);

}