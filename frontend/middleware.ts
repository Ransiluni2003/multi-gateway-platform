import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const userCookie = req.cookies.get("user")?.value;
  
  let user = null;
  try {
    if (userCookie && userCookie !== "undefined" && userCookie.length > 0) {
      user = JSON.parse(userCookie);
    }
  } catch (e) {
    // Invalid cookie, ignore it
    user = null;
  }

  const url = req.nextUrl.clone();

  // Redirect root to login explicitly
  if (url.pathname === "/") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 1️⃣ Redirect unauthenticated users to /login (require BOTH token AND valid user)
  const hasValidAuth = token && user && user.role;
  if (!hasValidAuth && !url.pathname.startsWith("/login") && !url.pathname.startsWith("/register")) {
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
  matcher: ["/", "/login", "/dashboard/:path*", "/register"],
};
