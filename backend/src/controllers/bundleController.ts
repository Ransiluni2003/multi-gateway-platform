import { Request, Response } from "express";
import { BundleService } from "../services/bundleService";

export class BundleController {
  /**
   * POST /api/bundles - Create a new bundle
   */
  static async createBundle(req: Request, res: Response) {
    try {
      const result = await BundleService.createBundle(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating bundle:", error);
      res.status(400).json({
        error: "Failed to create bundle",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bundles - List all bundles
   */
  static async listBundles(req: Request, res: Response) {
    try {
      const { status, search, limit, skip } = req.query;

      const result = await BundleService.listBundles({
        status: status as string,
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        skip: skip ? parseInt(skip as string) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      console.error("Error listing bundles:", error);
      res.status(500).json({
        error: "Failed to list bundles",
        message: error.message,
      });
    }
  }

  /**
   * GET /api/bundles/:id - Get bundle by ID
   */
  static async getBundleById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BundleService.getBundleById(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error getting bundle:", error);
      const status = error.message === "Bundle not found" ? 404 : 500;
      res.status(status).json({
        error: "Failed to get bundle",
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/bundles/:id - Update bundle
   */
  static async updateBundle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BundleService.updateBundle(id, req.body);
      res.json(result);
    } catch (error: any) {
      console.error("Error updating bundle:", error);
      const status = error.message === "Bundle not found" ? 404 : 400;
      res.status(status).json({
        error: "Failed to update bundle",
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/bundles/:id - Delete bundle
   */
  static async deleteBundle(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BundleService.deleteBundle(id);
      res.json(result);
    } catch (error: any) {
      console.error("Error deleting bundle:", error);
      const status = error.message === "Bundle not found" ? 404 : 500;
      res.status(status).json({
        error: "Failed to delete bundle",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/bundles/:id/calculate-price - Calculate bundle price
   */
  static async calculatePrice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity = 1, taxRate = 0.08 } = req.body;

      const result = await BundleService.calculatePrice(
        id,
        quantity,
        taxRate
      );

      res.json(result);
    } catch (error: any) {
      console.error("Error calculating price:", error);
      res.status(400).json({
        error: "Failed to calculate price",
        message: error.message,
      });
    }
  }

  /**
   * POST /api/bundles/:id/invoice - Generate invoice
   */
  static async generateInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity = 1, taxRate = 0.08 } = req.body;

      const result = await BundleService.generateInvoice(
        id,
        quantity,
        taxRate
      );

      res.json(result);
    } catch (error: any) {
      console.error("Error generating invoice:", error);
      res.status(400).json({
        error: "Failed to generate invoice",
        message: error.message,
      });
    }
  }
}
