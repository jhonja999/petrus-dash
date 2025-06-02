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
      // Token is invalid, clear cookie and treat as unauthenticated
      console.error("Invalid token:", error)
      userPayload = null
    }
  }

  const { pathname } = request.nextUrl

  // Helper functions
  const isAdmin = (user: any) => user?.role === "Admin" || user?.role === "S_A"
  const isConductor = (user: any) => user?.role === "Operador"

  // 1. Allow access to public routes
  if (
    pathname.startsWith("/auth/login") ||
    pathname.startsWith("/auth/register") ||
    pathname.startsWith("/auth/unauthorized") ||
    pathname === "/" || // Always allow homepage access
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images")
  ) {
    // If authenticated user tries to access login/register, redirect to their dashboard
    if (userPayload && (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/register"))) {
      if (isAdmin(userPayload)) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      } else if (isConductor(userPayload)) {
        return NextResponse.redirect(new URL(`/despacho/${userPayload.id}`, request.url))
      }
    }
    return NextResponse.next()
  }

  // 2. Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!userPayload) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
    if (!isAdmin(userPayload)) {
      return NextResponse.redirect(new URL("/auth/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // 3. Protect despacho routes
  if (pathname.startsWith("/despacho")) {
    if (!userPayload) {
      return NextResponse.redirect(new URL("/auth/login", request.url))
    }
    
    // Allow access to conductors and admins
    if (!isConductor(userPayload) && !isAdmin(userPayload)) {
      return NextResponse.redirect(new URL("/auth/unauthorized", request.url))
    }

    // Optional: Ensure conductors only access their own routes
    const driverIdFromPath = pathname.split("/")[2]
    if (isConductor(userPayload) && driverIdFromPath && userPayload.id !== parseInt(driverIdFromPath)) {
      return NextResponse.redirect(new URL("/auth/unauthorized", request.url))
    }

    return NextResponse.next()
  }

  // 4. Protect other API routes (except auth)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // 5. Default: allow access to other routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}