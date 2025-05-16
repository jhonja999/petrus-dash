import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Define protected routes that require admin access
const isAdminRoute = createRouteMatcher(["/admin(.*)", "/settings(.*)"])

// Define routes that require conductor role
const isConductorRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/trucks(.*)",
  "/customers(.*)",
  "/assignment(.*)",
  "/discharges(.*)",
  "/reports(.*)",
  "/users(.*)", // Allow conductors to access users page
])

export default clerkMiddleware(async (auth, req) => {
  // Get user role from session claims
  const session = await auth()
  const userRole = session.sessionClaims?.metadata?.role

  // Protect admin routes
  if (isAdminRoute(req)) {
    if (userRole !== "admin") {
      const url = new URL("/unauthorized", req.url)
      return NextResponse.redirect(url)
    }
  }

  // Protect conductor routes
  if (isConductorRoute(req)) {
    if (userRole !== "admin" && userRole !== "conductor") {
      const url = new URL("/unauthorized", req.url)
      return NextResponse.redirect(url)
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
