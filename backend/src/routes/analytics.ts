import express from "express";
import { getDashboardStats, getChartData } from "../controllers/analyticsController";

const router = express.Router();

// Fetch overall financial analytics (total income, expenses, etc.)
router.get("/totals", getDashboardStats);

// Fetch data for charts (like daily/weekly reports)
router.get("/charts", getChartData);

export default router;
