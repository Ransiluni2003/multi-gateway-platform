import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface CartItem {
  productId: string;
  quantity: number;
}

interface CartItemWithProduct extends CartItem {
  product?: {
    id: string;
    name: string;
    price: number;
  };
}

/**
 * Helper to parse cart from cookie
 */
function parseCart(cookie?: string): CartItem[] {
  if (!cookie) return [];
  try {
    const parsed = JSON.parse(cookie);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Helper to validate and sanitize cart items
 */
function validateCartItem(item: CartItem): boolean {
  return (
    item &&
    typeof item.productId === "string" &&
    item.productId.length > 0 &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0
  );
}

/**
 * GET /api/cart - Retrieve current cart
 * Returns cart items with product details
 */
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("cart")?.value;
    let cart = parseCart(cookie);

    // Filter out invalid items
    cart = cart.filter(validateCartItem);

    // Fetch product details for all items
    const productIds = cart.map((c: any) => c.productId);
    const products =
      productIds.length > 0
        ? await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, price: true },
          })
        : [];

    const cartWithProducts: CartItemWithProduct[] = cart.map((c) => ({
      ...c,
      product: products.find((p: any) => p.id === c.productId),
    }));

    return NextResponse.json({
      cart,
      cartWithProducts,
      total: cart.reduce((sum, c) => {
        const product = products.find((p: any) => p.id === c.productId);
        return sum + (product ? product.price * c.quantity : 0);
      }, 0),
    });
  } catch (error) {
    console.error("GET /api/cart error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart - Add item to cart (adds to existing quantity if duplicate)
 * Body: { productId: string, quantity?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, quantity = 1 } = body as {
      productId?: string;
      quantity?: number;
    };

    // Validation
    if (!productId || typeof productId !== "string" || productId.length === 0) {
      return NextResponse.json(
        { error: "Valid productId is required" },
        { status: 400 }
      );
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be a positive integer" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, stock: true },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: "Insufficient stock available" },
        { status: 400 }
      );
    }

    // Parse existing cart
    const cookie = req.cookies.get("cart")?.value;
    let cart = parseCart(cookie);

    // Find existing item
    const existing = cart.find((c: any) => c.productId === productId);

    if (existing) {
      // Check stock for total quantity
      const totalQuantity = existing.quantity + quantity;
      if (totalQuantity > product.stock) {
        return NextResponse.json(
          { error: `Only ${product.stock} items available` },
          { status: 400 }
        );
      }
      existing.quantity = totalQuantity;
    } else {
      // Add new item
      cart.push({ productId, quantity });
    }

    // Return updated cart
    const res = NextResponse.json({ cart, added: true });
    res.cookies.set("cart", JSON.stringify(cart), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: false,
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    console.error("POST /api/cart error:", error);
    return NextResponse.json(
      { error: "Failed to add item to cart" },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/cart - Update cart item quantity or remove item
 * Body: { productId: string, quantity: number (0 to remove) }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, quantity } = body as {
      productId?: string;
      quantity?: number;
    };

    // Validation
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { error: "Valid productId is required" },
        { status: 400 }
      );
    }

    if (typeof quantity === 'undefined' || !Number.isInteger(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "Quantity must be a non-negative integer" },
        { status: 400 }
      );
    }

    // Parse existing cart
    const cookie = req.cookies.get("cart")?.value;
    let cart = parseCart(cookie);

    // Find item
    const itemIndex = cart.findIndex((c) => c.productId === productId);

    if (itemIndex === -1) {
      return NextResponse.json(
        { error: "Item not found in cart" },
        { status: 404 }
      );
    }

    if (quantity === 0) {
      // Remove item from cart
      cart.splice(itemIndex, 1);
    } else {
      // Verify stock
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { stock: true },
      });

      if (!product || quantity > product.stock) {
        return NextResponse.json(
          { error: "Insufficient stock available" },
          { status: 400 }
        );
      }

      // Update quantity
      cart[itemIndex].quantity = quantity;
    }

    // Return updated cart
    const res = NextResponse.json({ cart, updated: true });
    res.cookies.set("cart", JSON.stringify(cart), {
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      httpOnly: false,
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    console.error("PUT /api/cart error:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/cart - Clear entire cart
 */
export async function DELETE(req: NextRequest) {
  try {
    const res = NextResponse.json({ cart: [], cleared: true });
    res.cookies.set("cart", "", {
      path: "/",
      maxAge: 0,
    });
    return res;
  } catch (error) {
    console.error("DELETE /api/cart error:", error);
    return NextResponse.json(
      { error: "Failed to clear cart" },
      { status: 500 }
    );
  }
}
