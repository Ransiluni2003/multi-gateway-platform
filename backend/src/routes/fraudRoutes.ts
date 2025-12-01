import express from "express";
import { getFraudAndRefundTrend } from "../controllers/fraudController";

const router = express.Router();

router.get("/trend", getFraudAndRefundTrend);

export default router;
