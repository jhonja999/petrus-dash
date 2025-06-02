import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/unauthorized"]

  // Check if it's a public route
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Get token from cookies
  const token = request.cookies.get("token")?.value

  // If no token, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Verify token
    const user = await verifyToken(token)

    // Admin routes - require Admin or S_A role
    if (pathname.startsWith("/admin")) {
      if (user.role !== "Admin" && user.role !== "S_A") {
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }
    }

    // Despacho routes - allow all authenticated users
    if (pathname.startsWith("/despacho")) {
      // All authenticated users can access despacho routes
      return NextResponse.next()
    }

    return NextResponse.next()
  } catch (error) {
    // Invalid token, redirect to login
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
