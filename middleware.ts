import { NextResponse } from "next/server"
import { jwtVerify } from "jose"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Validate JWT_SECRET is available
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET environment variable is not set")
    return NextResponse.redirect(new URL("/", request.url))
  }

  const { pathname } = request.nextUrl
  const token = request.cookies.get("token")?.value
  const secret = new TextEncoder().encode(process.env.JWT_SECRET)
  const url = request.nextUrl.clone()

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/auth/register", "/auth/login", "/unauthorized"]

  if (publicRoutes.includes(pathname)) {
    // If user has token and visits public route, redirect to dashboard
    if (token) {
      try {
        const { payload } = await jwtVerify(token, secret)
        const redirectPath = payload.role === "admin" ? "/admin/dashboard" : `/despacho/${payload.id}`
        return NextResponse.redirect(new URL(redirectPath, request.url))
      } catch (error) {
        // Invalid token, clear it and continue
        const response = NextResponse.next()
        response.cookies.delete("token")
        return response
      }
    }
    return NextResponse.next()
  }

  // Protected routes require authentication
  if (!token) {
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  try {
    const { payload } = await jwtVerify(token, secret)
    const { role, id } = payload

    // Define allowed routes for each role
    const adminRoutes = ["/admin"]
    const conductorRoutes = [`/despacho/${id}`]

    // Check if user can access the route
    const isAllowed =
      role === "admin"
        ? adminRoutes.some((route) => pathname.startsWith(route))
        : conductorRoutes.some((route) => pathname.startsWith(route))

    if (!isAllowed) {
      const redirectPath = role === "admin" ? "/admin/dashboard" : `/despacho/${id}`
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    return NextResponse.next()
  } catch (error) {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL("/auth/login", request.url))
    response.cookies.delete("token")
    return response
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
