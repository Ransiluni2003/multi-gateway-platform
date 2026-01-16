import { NextResponse } from "next/server";
import products from "@/lib/mockProducts";

export async function GET() {
  return NextResponse.json({ products });
}
