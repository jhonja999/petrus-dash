import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken, isAdmin, isOperator } from "./lib/jwt"

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value
  let userPayload = null

  // Verify token if present
  if (token) {
    try {
      userPayload = await verifyToken(token)
    } catch (error) {
      console.error("Token verification failed:", error)
      userPayload = null
    }
  }

  const { pathname } = request.nextUrl
  const isAuthenticated = !!userPayload

  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/unauthorized",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
  ]

  const isPublicRoute =
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images")

  // Allow access to public routes
  if (isPublicRoute) {
    // Redirect authenticated users away from auth pages
    if (isAuthenticated && userPayload && (pathname === "/login" || pathname === "/register")) {
      if (isAdmin(userPayload)) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      } else if (isOperator(userPayload)) {
        return NextResponse.redirect(new URL(`/despacho/${userPayload.id}`, request.url))
      }
    }
    return NextResponse.next()
  }

  // Require authentication for all protected routes
  if (!isAuthenticated) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Check user state
  if (userPayload && userPayload.state !== "Activo" && userPayload.state !== "Asignado") {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Account inactive" }, { status: 403 })
    }
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  // Admin routes - accessible by Admin and S_A only
  const adminRoutes = ["/dashboard", "/assignments", "/customers", "/trucks", "/reports", "/users"]

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route))

  if (isAdminRoute) {
    if (!isAdmin(userPayload)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          {
            error: "Acceso denegado. Solo administradores pueden acceder a esta funcionalidad.",
          },
          { status: 403 },
        )
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }
    return NextResponse.next()
  }

  // Despacho routes - accessible by Operators and Admins
  if (pathname.startsWith("/despacho")) {
    if (!isOperator(userPayload) && !isAdmin(userPayload)) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          {
            error: "Acceso denegado. No tienes permisos para acceder a esta funcionalidad.",
          },
          { status: 403 },
        )
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    // Ensure operators only access their own routes
    const driverIdFromPath = pathname.split("/")[2]
    if (
      userPayload &&
      isOperator(userPayload) &&
      !isAdmin(userPayload) &&
      driverIdFromPath &&
      driverIdFromPath !== "undefined" &&
      userPayload.id !== Number.parseInt(driverIdFromPath)
    ) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          {
            error: "Acceso denegado. Solo puedes acceder a tu propio panel.",
          },
          { status: 403 },
        )
      }
      return NextResponse.redirect(new URL("/unauthorized", request.url))
    }

    return NextResponse.next()
  }

  // API routes protection
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    // Additional API-specific checks can be added here
    return NextResponse.next()
  }

  // Default: allow access to other routes
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
