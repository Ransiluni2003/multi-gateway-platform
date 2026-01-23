import { IBundleItem } from "../models/BundleItem";
import { IBundleDiscount, IDiscountConditions } from "../models/BundleDiscount";

export interface BundlePricing {
  basePrice: number;
  discountAmount: number;
  subtotal: number;
  tax: number;
  total: number;
  appliedDiscounts: Array<{
    type: string;
    amount: number;
    description: string;
  }>;
}

export class DiscountEngine {
  /**
   * Apply percentage discount
   */
  static applyPercentageDiscount(
    basePrice: number,
    discountValue: number
  ): number {
    if (discountValue < 0 || discountValue > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }
    return basePrice * (discountValue / 100);
  }

  /**
   * Apply fixed amount discount
   */
  static applyFixedDiscount(basePrice: number, discountValue: number): number {
    return Math.min(basePrice, Math.max(0, discountValue));
  }

  /**
   * Apply tiered discount based on quantity
   */
  static applyTieredDiscount(
    quantity: number,
    unitPrice: number,
    conditions: IDiscountConditions
  ): number {
    if (!conditions.tiers || conditions.tiers.length === 0) {
      return 0;
    }

    // Find applicable tier
    const applicableTier = conditions.tiers
      .filter((tier) => quantity >= tier.min_qty)
      .filter(
        (tier) => !tier.max_qty || quantity <= tier.max_qty
      )
      .sort((a, b) => b.discount - a.discount)[0];

    if (!applicableTier) {
      return 0;
    }

    return (unitPrice * quantity * applicableTier.discount) / 100;
  }

  /**
   * Apply BOGO (Buy One Get One) discount
   */
  static applyBOGODiscount(
    items: Array<{ quantity: number; unitPrice: number }>,
    conditions: IDiscountConditions
  ): number {
    const { buy = 1, get = 1, apply_to = "cheapest" } = conditions;

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const setsCount = Math.floor(totalItems / (buy + get));

    if (setsCount === 0) {
      return 0;
    }

    // Sort items by price
    const sortedItems =
      apply_to === "cheapest"
        ? [...items].sort((a, b) => a.unitPrice - b.unitPrice)
        : apply_to === "most_expensive"
        ? [...items].sort((a, b) => b.unitPrice - a.unitPrice)
        : items;

    // Calculate discount on free items
    let discountAmount = 0;
    let freeItemsRemaining = setsCount * get;

    for (const item of sortedItems) {
      if (freeItemsRemaining <= 0) break;

      const itemsToDiscount = Math.min(item.quantity, freeItemsRemaining);
      discountAmount += itemsToDiscount * item.unitPrice;
      freeItemsRemaining -= itemsToDiscount;
    }

    return discountAmount;
  }

  /**
   * Calculate bundle pricing with all discounts applied
   */
  static calculateBundlePricing(
    items: IBundleItem[],
    discounts: IBundleDiscount[],
    quantity: number = 1,
    taxRate: number = 0.08
  ): BundlePricing {
    // Calculate base price
    const basePrice = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const totalBasePrice = basePrice * quantity;

    // Sort discounts by priority
    const sortedDiscounts = [...discounts].sort(
      (a, b) => b.priority - a.priority
    );

    // Filter active discounts
    const now = new Date();
    const activeDiscounts = sortedDiscounts.filter((discount) => {
      if (discount.startDate && discount.startDate > now) return false;
      if (discount.endDate && discount.endDate < now) return false;
      return true;
    });

    let totalDiscount = 0;
    const appliedDiscounts: Array<{
      type: string;
      amount: number;
      description: string;
    }> = [];

    // Apply each discount
    for (const discount of activeDiscounts) {
      let discountAmount = 0;
      let description = "";

      try {
        switch (discount.discountType) {
          case "percentage":
            discountAmount = this.applyPercentageDiscount(
              totalBasePrice,
              discount.discountValue
            );
            description = `${discount.discountValue}% off`;
            break;

          case "fixed":
            discountAmount = this.applyFixedDiscount(
              totalBasePrice,
              discount.discountValue
            );
            description = `$${discount.discountValue.toFixed(2)} off`;
            break;

          case "tiered":
            discountAmount = this.applyTieredDiscount(
              quantity,
              basePrice,
              discount.conditions || {}
            );
            description = `Tiered discount for ${quantity} items`;
            break;

          case "bogo":
            const itemsForBogo = items.map((item) => ({
              quantity: item.quantity * quantity,
              unitPrice: item.unitPrice,
            }));
            discountAmount = this.applyBOGODiscount(
              itemsForBogo,
              discount.conditions || {}
            );
            description = `BOGO discount`;
            break;
        }

        if (discountAmount > 0) {
          totalDiscount += discountAmount;
          appliedDiscounts.push({
            type: discount.discountType,
            amount: discountAmount,
            description,
          });
        }
      } catch (error) {
        console.error(`Error applying discount:`, error);
      }
    }

    // Ensure total discount doesn't exceed base price
    totalDiscount = Math.min(totalDiscount, totalBasePrice);

    const subtotal = totalBasePrice - totalDiscount;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return {
      basePrice: totalBasePrice,
      discountAmount: totalDiscount,
      subtotal,
      tax,
      total,
      appliedDiscounts,
    };
  }
}
