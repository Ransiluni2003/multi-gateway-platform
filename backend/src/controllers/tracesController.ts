// backend/src/controllers/tracesController.ts

import { Request, Response } from "express";

import TraceModel from "../models/Trace";

export async function getRecentTracesController(req: Request, res: Response) {
  try {
    const limit = Number(req.query.limit) || 50;
    const q = req.query.q ? String(req.query.q) : null;
    const serviceFilter = req.query.service ? String(req.query.service) : null;

    // Build MongoDB query
    const query: any = {};
    if (q) {
      query.$or = [
        { path: { $regex: q, $options: "i" } },
        { method: { $regex: q, $options: "i" } },
        { status: isNaN(Number(q)) ? undefined : Number(q) }
      ].filter(Boolean);
    }
    if (serviceFilter) {
      query.serviceName = serviceFilter;
    }

    const data = await TraceModel.find(query)
      .sort({ ts: -1 })
      .limit(limit)
      .lean();

    // Map to frontend-friendly shape and convert duration to microseconds
    const mapped = data.map((t: any) => ({
      traceID: t.id,
      serviceName: t.serviceName || 'api',
      duration: Math.round((t.durationMs || 0) * 1000), // μs
      status: t.status || 0,
      path: t.path,
      method: t.method,
      ts: t.ts,
    }));

    res.json({ traces: mapped });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch traces', details: err });
  }
}
