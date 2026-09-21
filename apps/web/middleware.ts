import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("harsi_session")?.value;
  const secret = process.env.AUTH_SECRET;
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.searchParams.set("next", request.nextUrl.pathname);
  if (!token || !secret) return NextResponse.redirect(login);
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(login);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/strategies/:path*",
    "/signals/:path*",
    "/positions/:path*",
    "/orders/:path*",
    "/history/:path*",
    "/analytics/:path*",
    "/backtest/:path*",
    "/brokers/:path*",
    "/automation/:path*",
    "/settings/:path*",
    "/activity/:path*",
    "/dashboard",
    "/strategies",
    "/signals",
    "/positions",
    "/orders",
    "/history",
    "/analytics",
    "/backtest",
    "/brokers",
    "/automation",
    "/settings",
    "/activity",
  ],
};
