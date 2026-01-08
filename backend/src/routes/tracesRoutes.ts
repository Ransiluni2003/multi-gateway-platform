// backend/src/routes/tracesRoutes.ts

import express from "express";
import { getRecentTracesController, getTraceByIdController } from "../controllers/tracesController";

const router = express.Router();

router.get("/recent", getRecentTracesController);
router.get("/:id", getTraceByIdController);

export default router;
