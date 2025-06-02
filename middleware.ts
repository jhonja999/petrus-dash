import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/jwt" // Ensure correct import path for verifyToken
import { isAdmin, isConductor } from "./lib/auth" // Ensure correct import path for role checks

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  const isAuthenticated = !!token
  let userPayload = null

  if (isAuthenticated) {
    userPayload = await verifyToken(token as string)
    // If token is invalid, clear cookie and treat as unauthenticated
    if (!userPayload) {
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.set("token", "", { expires: new Date(0), path: "/" })
      return response
    }
  }

  const { pathname } = request.nextUrl

  // 1. Allow access to public routes (login, register, unauthorized, homepage, API auth routes)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/unauthorized") ||
    pathname === "/" || // Allow homepage access for all
    pathname.startsWith("/api/auth") || // Allow auth API routes
    pathname.startsWith("/_next") || // Allow Next.js internal routes
    pathname.startsWith("/favicon.ico") || // Allow favicon
    pathname.startsWith("/static") // Allow static assets
  ) {
    // If authenticated user tries to access login/register, redirect to their dashboard
    if (isAuthenticated && (pathname.startsWith("/login") || pathname.startsWith("/register"))) {
      if (isAdmin(userPayload)) {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url))
      } else if (isConductor(userPayload)) {
        return NextResponse.redirect(new URL(`/despacho/${userPayload?.id}`, request.url))
      }
    }
    return NextResponse.next()
  }

  // 2. Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (!isAdmin(userPayload)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // 3. Protect despacho routes
  if (pathname.startsWith("/despacho")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    // Check if the user is an Operador or Admin/S_A
    if (!isConductor(userPayload) && !isAdmin(userPayload)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Optional: If you want to ensure a conductor only accesses their own despacho ID
    // const driverIdFromPath = pathname.split('/')[2];
    // if (isConductor(userPayload) && userPayload?.id !== Number(driverIdFromPath)) {
    //   return NextResponse.redirect(new URL('/unauthorized', request.url));
    // }

    return NextResponse.next()
  }

  // 4. Default: If no specific rule matches, allow access (you might want to change this to deny by default)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any files in the public folder (e.g., /images, /docs)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|images|docs).*)",
  ],
}
