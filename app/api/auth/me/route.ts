import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        email: true,
        name: true,
        lastname: true,
        role: true,
        dni: true,
        state: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user is still active
    if (user.state === "Inactivo" || user.state === "Suspendido" || user.state === "Eliminado") {
      return NextResponse.json(
        {
          error: "Account inactive",
          user: null,
        },
        { status: 403 },
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        dni: user.dni,
        name: user.name,
        lastname: user.lastname,
        state: user.state,
      },
    })
  } catch (error: any) {
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}
