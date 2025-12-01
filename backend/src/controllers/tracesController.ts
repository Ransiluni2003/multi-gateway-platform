// backend/src/controllers/tracesController.ts

import { Request, Response } from "express";
import { getRecentTraces } from "../middleware/traceCapture.js";

export function getRecentTracesController(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 50;
  const q = req.query.q ? String(req.query.q) : null;
  const serviceFilter = req.query.service ? String(req.query.service) : null;

  let data = getRecentTraces(limit);

  // optional filtering by free text
  if (q) {
    data = data.filter(t =>
      t.path.includes(q) ||
      t.method.includes(q) ||
      String(t.status) === q
    );
  }

  // filter by service name if provided
  if (serviceFilter) {
    data = data.filter((t) => (t as any).serviceName === serviceFilter);
  }

  // Map to frontend-friendly shape and convert duration to microseconds
  const mapped = data.map((t) => ({
    traceID: t.id,
    serviceName: (t as any).serviceName || 'api',
    duration: Math.round((t.durationMs || 0) * 1000), // μs
    status: t.status || 0,
    path: t.path,
    method: t.method,
    ts: t.ts,
  }));

  res.json({ traces: mapped });
}
