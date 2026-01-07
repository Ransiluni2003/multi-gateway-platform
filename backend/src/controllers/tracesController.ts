// backend/src/controllers/tracesController.ts

import { Request, Response } from "express";

import TraceModel from "../models/Trace";

export async function getRecentTracesController(req: Request, res: Response) {
  try {
    const limit = Number(req.query.limit) || 50;
    const q = req.query.q ? String(req.query.q) : null;
    const serviceFilter = req.query.service ? String(req.query.service) : null;
    const methodFilter = req.query.method ? String(req.query.method) : null;
    const statusFilter = req.query.status ? Number(req.query.status) : null;

    // Build MongoDB query
    const query: any = {};
    if (q) {
      query.$or = [
        { path: { $regex: q, $options: "i" } },
        { method: { $regex: q, $options: "i" } },
        { traceID: { $regex: q, $options: "i" } },
      ];
    }
    if (serviceFilter) {
      query.serviceName = serviceFilter;
    }
    if (methodFilter) {
      query.method = methodFilter;
    }
    if (statusFilter) {
      query.status = statusFilter;
    }

    const data = await TraceModel.find(query)
      .sort({ createdAt: -1, ts: -1 })
      .limit(limit)
      .lean();

    // Map to frontend-friendly shape
    const mapped = data.map((t: any) => ({
      traceID: t.traceID || t.id,
      serviceName: t.serviceName || 'api',
      duration: Math.round((t.durationMs || 0) * 1000), // microseconds
      status: t.status || 0,
      path: t.path,
      method: t.method,
      ts: t.ts,
      spans: (t.spans || []).map((span: any) => ({
        spanID: span.spanID,
        operation: span.operation,
        service: span.service,
        status: span.status,
        startOffsetMs: span.startOffsetMs || 0,
        durationMs: span.durationMs || 0,
      })),
    }));

    res.json({ traces: mapped });
  } catch (err) {
    console.error('[TracesController] Error fetching traces:', err);
    res.status(500).json({ error: 'Failed to fetch traces', details: err });
  }
}

