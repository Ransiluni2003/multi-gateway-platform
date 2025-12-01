import express from "express";
import { getSellerTransactions } from "../controllers/payoutsController";

const router = express.Router();

// Fetch all transactions related to a specific seller
router.get("/:sellerId", getSellerTransactions);

export default router;
