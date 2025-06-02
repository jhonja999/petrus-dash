import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth" // This correctly uses cookies() on the server

/**
 * GET /api/auth/status
 * Checks the authentication status of the current user.
 * This route is a Server Component and can safely use `next/headers` (via `getAuthUser`).
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (user) {
      // Return only necessary user info for the client
      return NextResponse.json(
        {
          isAuthenticated: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            lastname: user.lastname,
            role: user.role,
            dni: user.dni,
          },
        },
        { status: 200 },
      )
    } else {
      return NextResponse.json({ isAuthenticated: false, user: null }, { status: 200 })
    }
  } catch (error) {
    console.error("API Error checking auth status:", error)
    return NextResponse.json(
      { isAuthenticated: false, user: null, error: "Failed to check authentication status" },
      { status: 500 },
    )
  }
}
