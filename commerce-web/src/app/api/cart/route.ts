import { NextRequest, NextResponse } from "next/server";

type CartItem = { productId: string; quantity: number };

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get("cart")?.value;
  let cart: CartItem[] = [];
  try {
    if (cookie) cart = JSON.parse(cookie);
  } catch (e) {
    cart = [];
  }

  return NextResponse.json({ cart });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, quantity } = body as {
      productId: string;
      quantity?: number;
    };

    if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

    const cookie = req.cookies.get("cart")?.value;
    let cart: CartItem[] = [];
    try {
      if (cookie) cart = JSON.parse(cookie);
    } catch {
      cart = [];
    }

    const existing = cart.find((c) => c.productId === productId);
    if (existing) existing.quantity = (existing.quantity || 0) + (quantity || 1);
    else cart.push({ productId, quantity: quantity || 1 });

    const res = NextResponse.json({ cart });
    res.cookies.set("cart", JSON.stringify(cart), { path: "/", maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ cart: [] });
  res.cookies.set("cart", "", { path: "/", maxAge: 0 });
  return res;
}
