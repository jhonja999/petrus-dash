import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value

    // ✅ Silencioso: No token es normal para usuarios no logueados
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const payload = await verifyToken(token)

    // ✅ Silencioso: Token inválido es normal para tokens expirados
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // ✅ Success: Usuario autenticado correctamente
    return NextResponse.json({
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        dni: payload.dni,
        name: payload.name,
        lastname: payload.lastname,
        state: "Activo", // You might want to fetch this from database
      },
    })
  } catch (error) {
    // ✅ Solo log errores reales del servidor, no auth failures
    console.error("Error in /api/auth/me:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}