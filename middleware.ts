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
    console.log(`👤 Middleware: User verified - Role: ${user.role}, State: ${user.state}, ID: ${user.id}`)

    // Check user state
    if (user.state === "Inactivo" || user.state === "Suspendido" || user.state === "Eliminado") {
      console.log(`⚠️ Middleware: User state invalid: ${user.state}`)
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // **FIXED: Add role-based default redirects for root access**
    // If user tries to access root "/" and is authenticated, redirect to their appropriate dashboard
    if (pathname === "/") {
      if (user.role === "Admin" || user.role === "S_A") {
        console.log(`🔄 Middleware: Redirecting ${user.role} from root to dashboard`)
        return NextResponse.redirect(new URL("/dashboard", request.url))
      } else if (user.role === "Operador") {
        console.log(`🔄 Middleware: Redirecting Operador from root to despacho`)
        return NextResponse.redirect(new URL(`/despacho/${user.id}`, request.url))
      }
    }

    // Admin routes - all routes under (admin) group: dashboard, assignments, customers, reports, trucks
    const adminRoutes = ["/dashboard", "/assignments", "/customers", "/reports", "/trucks", "/users"]
    const isAdminRoute = adminRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))

    if (isAdminRoute) {
      console.log(`🔐 Middleware: Checking admin route access for role: ${user.role} on ${pathname}`)
      if (user.role !== "Admin" && user.role !== "S_A") {
        console.log(`❌ Middleware: Admin route access denied - insufficient role for ${user.role}`)
        return NextResponse.redirect(new URL("/unauthorized", request.url))
      }
      console.log(`✅ Middleware: Admin route access granted for ${user.role}`)
      return NextResponse.next()
    }

    // **FIXED: Updated despacho route handling for new structure**
    if (pathname.startsWith("/despacho")) {
      const pathParts = pathname.split("/").filter(Boolean)

      console.log(
        `🚛 Middleware: Checking despacho access - Path parts:`,
        pathParts,
        `User: ${user.id}, Role: ${user.role}`,
      )

      // If base /despacho path - accessible by all authenticated users
      if (pathParts.length === 1) {
        console.log("🔄 Middleware: On base /despacho path - allowing access")
        return NextResponse.next()
      }

      // If /despacho/admin - only for admins
      if (pathParts.length === 2 && pathParts[1] === "admin") {
        if (user.role === "Admin" || user.role === "S_A") {
          console.log(`✅ Middleware: Admin accessing /despacho/admin`)
          return NextResponse.next()
        } else {
          console.log(`❌ Middleware: Non-admin trying to access /despacho/admin`)
          return NextResponse.redirect(new URL("/unauthorized", request.url))
        }
      }

      // If /despacho/[driverId] - check permissions
      if (pathParts.length === 2) {
        const driverIdFromPath = pathParts[1]

        // Admins and S_A can access any driver's panel
        if (user.role === "Admin" || user.role === "S_A") {
          console.log(`✅ Middleware: Admin/SA accessing driver ${driverIdFromPath} panel`)
          return NextResponse.next()
        }

        // Operators can only access their own panel
        if (user.role === "Operador") {
          if (driverIdFromPath === String(user.id)) {
            console.log(`✅ Middleware: Operador ${user.id} accessing own panel`)
            return NextResponse.next()
          } else {
            console.log(`❌ Middleware: Operador ${user.id} trying to access driver ${driverIdFromPath}`)
            return NextResponse.redirect(new URL("/unauthorized", request.url))
          }
        }
      }

      // If we reach here, deny access
      console.log(`❌ Middleware: Unrecognized despacho route pattern: ${pathname}`)
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // **FIXED: For any other protected route, check permissions**
    // If we reach here, it's a protected route that doesn't match admin or despacho patterns
    console.log(`🔍 Middleware: Checking general route access for ${pathname}`)

    // Allow access to other routes based on user role
    if (user.role === "Admin" || user.role === "S_A") {
      console.log(`✅ Middleware: Admin/SA general access granted to ${pathname}`)
      return NextResponse.next()
    } else if (user.role === "Operador") {
      // Operators should only access their despacho routes
      console.log(`❌ Middleware: Operador trying to access unauthorized route ${pathname}`)
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    console.log(`✅ Middleware: General access granted to ${pathname}`)
    return NextResponse.next()
  } catch (error) {
    console.error(`❌ Middleware: Token verification failed:`, error)
    // Clear the invalid token
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("token")
    return response
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
