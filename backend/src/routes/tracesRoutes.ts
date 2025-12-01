// backend/src/routes/tracesRoutes.ts

import express from "express";
import { getRecentTracesController } from "../controllers/tracesController";

const router = express.Router();

router.get("/recent", getRecentTracesController);

export default router;
