import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "@/lib/jwt"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log(`🔍 Middleware: Processing ${pathname}`)

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    console.log(`⏭️ Middleware: Skipping ${pathname}`)
    return NextResponse.next()
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/register", "/unauthorized"]

  // Check if it's a public route
  if (publicRoutes.includes(pathname)) {
    console.log(`✅ Middleware: ${pathname} is public route`)
    return NextResponse.next()
  }

  // Get token from cookies
  const token = request.cookies.get("token")?.value
  console.log(`🍪 Middleware: Token exists: ${!!token}`)

  // If no token, redirect to login
  if (!token) {
    console.log(`❌ Middleware: No token, redirecting to login`)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    // Verify token
    const user = await verifyToken(token)
    console.log(`👤 Middleware: User verified - Role: ${user.role}, State: ${user.state}`)

    // Check user state - be more permissive
    if (user.state === "Inactivo" || user.state === "Suspendido" || user.state === "Eliminado") {
      console.log(`⚠️ Middleware: User state invalid: ${user.state}`)
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Admin routes - require Admin or S_A role
    if (pathname.startsWith("/admin")) {
      console.log(`🔐 Middleware: Checking admin access for role: ${user.role}`)
      if (user.role !== "Admin" && user.role !== "S_A") {
        console.log(`❌ Middleware: Access denied - insufficient role for ${user.role}`)
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }
      console.log(`✅ Middleware: Admin access granted for ${user.role}`)
      return NextResponse.next()
    }

    // Despacho routes
    if (pathname.startsWith("/despacho")) {
      const pathParts = pathname.split("/")
      const driverIdFromPath = pathParts.length > 2 ? pathParts[2] : null

      // Operators can only access their own routes, admins can access all
      if (
        user.role === "Operador" &&
        driverIdFromPath &&
        driverIdFromPath !== "undefined" &&
        Number.parseInt(driverIdFromPath) !== user.id
      ) {
        console.log(`❌ Middleware: Operator ${user.id} trying to access driver ${driverIdFromPath}`)
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }

      console.log(`✅ Middleware: Despacho access granted`)
      return NextResponse.next()
    }

    console.log(`✅ Middleware: General access granted to ${pathname}`)
    return NextResponse.next()
  } catch (error) {
    console.log(`❌ Middleware: Token verification failed:`, error)
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
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).+)",
  ],
}
