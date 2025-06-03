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

    // Check user state
    if (user.state === "Inactivo" || user.state === "Suspendido" || user.state === "Eliminado") {
      console.log(`⚠️ Middleware: User state invalid: ${user.state}`)
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Admin routes - all routes under (admin) group: dashboard, assignments, customers, reports, trucks
    const adminRoutes = ["/dashboard", "/assignments", "/customers", "/reports", "/trucks"]
    const isAdminRoute = adminRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    )

    if (isAdminRoute) {
      console.log(`🔐 Middleware: Checking admin route access for role: ${user.role} on ${pathname}`)
      if (user.role !== "Admin" && user.role !== "S_A") {
        console.log(`❌ Middleware: Admin route access denied - insufficient role for ${user.role}`)
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }
      console.log(`✅ Middleware: Admin route access granted for ${user.role}`)
      return NextResponse.next()
    }

    // Despacho routes - for drivers
    if (pathname.startsWith("/despacho")) {
      const pathParts = pathname.split("/")
      const driverIdFromPath = pathParts.length > 2 ? pathParts[2] : null

      console.log(`🚛 Middleware: Checking despacho access - User: ${user.id}, Role: ${user.role}, Path ID: ${driverIdFromPath}`)

      // Admins and S_A can access any despacho route
      if (user.role === "Admin" || user.role === "S_A") {
        console.log(`✅ Middleware: Admin/SA accessing despacho route`)
        return NextResponse.next()
      }

      // Operators can only access their own routes
      if (user.role === "Operador") {
        if (driverIdFromPath && driverIdFromPath !== "undefined" && Number.parseInt(driverIdFromPath) !== user.id) {
          console.log(`❌ Middleware: Operator ${user.id} trying to access driver ${driverIdFromPath}`)
          return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
        console.log(`✅ Middleware: Operator accessing own despacho route`)
        return NextResponse.next()
      }

      // If role is not recognized for despacho routes
      console.log(`❌ Middleware: Unrecognized role ${user.role} for despacho routes`)
      return NextResponse.redirect(new URL("/unauthorized", request.url))
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