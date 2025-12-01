import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const userCookie = req.cookies.get("user")?.value;
  const user = userCookie ? JSON.parse(userCookie) : null;

  const url = req.nextUrl.clone();

  // 1️⃣ Redirect unauthenticated users to /login
  if (!token && !url.pathname.startsWith("/login")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 2️⃣ Role-based access control for dashboard sections
  if (url.pathname.startsWith("/dashboard")) {
    const role = user?.role;

    // Protect admin-only routes
    if (url.pathname.startsWith("/dashboard/admin") && role !== "administrator") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Protect seller-only routes
    if (url.pathname.startsWith("/dashboard/seller") && role !== "seller") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    // Protect user-only routes
    if (url.pathname.startsWith("/dashboard/user") && role !== "subscriber" && role !== "customer") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Allow request if everything is valid
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
