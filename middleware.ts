import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/jwt"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const isAuthenticated = !!token
  let userPayload = null

  if (isAuthenticated) {
    try {
      userPayload = await verifyToken(token as string)
    } catch (error) {
      console.error("Invalid token:", error)
      userPayload = null
    }
  }

  const { pathname } = request.nextUrl

  // Helper functions
  const isAdmin = (user: any) => user?.role === "Admin" || user?.role === "S_A"
  const isConductor = (user: any) => user?.role === "Operador"

  // 1. Public routes - always accessible
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/unauthorized") ||
    pathname === "/" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images")
  ) {
    // Redirect authenticated users away from auth pages
    if (userPayload && (pathname === "/login" || pathname === "/register")) {
      if (isAdmin(userPayload)) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      } else if (isConductor(userPayload)) {
        return NextResponse.redirect(new URL(`/despacho/${userPayload.id}`, request.url))
      }
    }
    return NextResponse.next()
  }

  // 2. Require authentication for all other routes
  if (!userPayload) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // 3. Admin routes - only for Admin and S_A
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/assignments") ||
    pathname.startsWith("/customers") ||
    pathname.startsWith("/trucks") ||
    pathname.startsWith("/reports")
  ) {
    if (!isAdmin(userPayload)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // 4. Despacho routes - for Operador and Admins
  if (pathname.startsWith("/despacho")) {
    if (!isConductor(userPayload) && !isAdmin(userPayload)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Ensure conductors only access their own routes
    const driverIdFromPath = pathname.split("/")[2]
    if (
      isConductor(userPayload) &&
      driverIdFromPath &&
      driverIdFromPath !== "undefined" &&
      userPayload.id !== Number.parseInt(driverIdFromPath)
    ) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    return NextResponse.next()
  }

  // 5. API routes protection (except auth)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 6. Default: allow access
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
