
import express from "express";
import { getDashboardStats, getChartData, getDashboardMetrics } from "../controllers/analyticsController";

const router = express.Router();

// Fetch overall financial analytics (total income, expenses, etc.)
router.get("/totals", getDashboardStats);

// Fetch data for charts (like daily/weekly reports)
router.get("/charts", getChartData);

// Dashboard metrics for cards
router.get("/dashboard-metrics", getDashboardMetrics);

export default router;
