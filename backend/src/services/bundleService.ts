import Bundle from "../models/Bundle";
import BundleItem from "../models/BundleItem";
import BundleDiscount from "../models/BundleDiscount";
import { DiscountEngine } from "./discountEngine";

export interface CreateBundleInput {
  name: string;
  description?: string;
  items: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    unitPrice: number;
    sortOrder?: number;
  }>;
  discounts?: Array<{
    discountType: "percentage" | "fixed" | "tiered" | "bogo";
    discountValue: number;
    conditions?: any;
    priority?: number;
    startDate?: Date;
    endDate?: Date;
  }>;
}

export class BundleService {
  /**
   * Create a new bundle with items and discounts
   */
  static async createBundle(input: CreateBundleInput) {
    const { name, description, items, discounts = [] } = input;

    // Create bundle
    const bundle = await Bundle.create({
      name,
      description,
      status: "active",
    });

    // Create bundle items
    const bundleItems = await Promise.all(
      items.map((item, index) =>
        BundleItem.create({
          bundleId: bundle._id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: item.sortOrder ?? index,
        })
      )
    );

    // Create bundle discounts
    const bundleDiscounts = await Promise.all(
      discounts.map((discount) =>
        BundleDiscount.create({
          bundleId: bundle._id,
          ...discount,
        })
      )
    );

    // Calculate pricing
    const pricing = DiscountEngine.calculateBundlePricing(
      bundleItems,
      bundleDiscounts,
      1
    );

    return {
      id: bundle._id,
      name: bundle.name,
      description: bundle.description,
      status: bundle.status,
      items: bundleItems.map((item) => ({
        id: item._id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder,
      })),
      discounts: bundleDiscounts.map((discount) => ({
        id: discount._id,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        conditions: discount.conditions,
        priority: discount.priority,
        startDate: discount.startDate,
        endDate: discount.endDate,
      })),
      pricing,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }

  /**
   * Get bundle by ID with items and discounts
   */
  static async getBundleById(bundleId: string) {
    const bundle = await Bundle.findById(bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }

    const items = await BundleItem.find({ bundleId: bundle._id }).sort({
      sortOrder: 1,
    });
    const discounts = await BundleDiscount.find({ bundleId: bundle._id }).sort({
      priority: -1,
    });

    const pricing = DiscountEngine.calculateBundlePricing(items, discounts, 1);

    return {
      id: bundle._id,
      name: bundle.name,
      description: bundle.description,
      status: bundle.status,
      items: items.map((item) => ({
        id: item._id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder,
      })),
      discounts: discounts.map((discount) => ({
        id: discount._id,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        conditions: discount.conditions,
        priority: discount.priority,
        startDate: discount.startDate,
        endDate: discount.endDate,
      })),
      pricing,
      createdAt: bundle.createdAt,
      updatedAt: bundle.updatedAt,
    };
  }

  /**
   * List all bundles with optional filters
   */
  static async listBundles(filters: {
    status?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }) {
    const { status, search, limit = 50, skip = 0 } = filters;

    const query: any = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const bundles = await Bundle.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Bundle.countDocuments(query);

    return {
      bundles: bundles.map((bundle) => ({
        id: bundle._id,
        name: bundle.name,
        description: bundle.description,
        status: bundle.status,
        createdAt: bundle.createdAt,
        updatedAt: bundle.updatedAt,
      })),
      total,
      limit,
      skip,
    };
  }

  /**
   * Update bundle
   */
  static async updateBundle(
    bundleId: string,
    updates: {
      name?: string;
      description?: string;
      status?: string;
    }
  ) {
    const bundle = await Bundle.findByIdAndUpdate(
      bundleId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!bundle) {
      throw new Error("Bundle not found");
    }

    return bundle;
  }

  /**
   * Delete bundle and related items/discounts
   */
  static async deleteBundle(bundleId: string) {
    const bundle = await Bundle.findByIdAndDelete(bundleId);
    if (!bundle) {
      throw new Error("Bundle not found");
    }

    // Delete related items and discounts
    await Promise.all([
      BundleItem.deleteMany({ bundleId }),
      BundleDiscount.deleteMany({ bundleId }),
    ]);

    return { message: "Bundle deleted successfully" };
  }

  /**
   * Calculate price for specific quantity
   */
  static async calculatePrice(
    bundleId: string,
    quantity: number = 1,
    taxRate: number = 0.08
  ) {
    const items = await BundleItem.find({ bundleId });
    const discounts = await BundleDiscount.find({ bundleId });

    if (items.length === 0) {
      throw new Error("Bundle has no items");
    }

    return DiscountEngine.calculateBundlePricing(
      items,
      discounts,
      quantity,
      taxRate
    );
  }

  /**
   * Generate invoice for bundle
   */
  static async generateInvoice(
    bundleId: string,
    quantity: number = 1,
    taxRate: number = 0.08
  ) {
    const bundle = await this.getBundleById(bundleId);
    const pricing = await this.calculatePrice(bundleId, quantity, taxRate);

    const invoiceId = `INV-${new Date().getFullYear()}-${Date.now()}`;

    return {
      invoiceId,
      bundleId,
      bundleName: bundle.name,
      quantity,
      lineItems: bundle.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity * quantity,
        unitPrice: item.unitPrice,
        total: item.unitPrice * item.quantity * quantity,
      })),
      basePrice: pricing.basePrice,
      discounts: pricing.appliedDiscounts,
      discountTotal: pricing.discountAmount,
      subtotal: pricing.subtotal,
      tax: pricing.tax,
      taxRate,
      total: pricing.total,
      generatedAt: new Date(),
    };
  }
}
