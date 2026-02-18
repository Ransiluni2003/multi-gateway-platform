import { Router } from "express";
import { BundleController } from "../controllers/bundleController";

const router = Router();

// Bundle CRUD operations
router.post("/bundles", BundleController.createBundle);
router.get("/bundles", BundleController.listBundles);
router.get("/bundles/:id", BundleController.getBundleById);
router.put("/bundles/:id", BundleController.updateBundle);
router.delete("/bundles/:id", BundleController.deleteBundle);

// Bundle operations
router.post("/bundles/:id/calculate-price", BundleController.calculatePrice);
router.post("/bundles/:id/invoice", BundleController.generateInvoice);

export default router;
