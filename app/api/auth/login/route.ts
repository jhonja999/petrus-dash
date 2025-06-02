import { SignJWT } from "jose"
import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET no está configurado")
      return NextResponse.json({ error: "Configuración del servidor incompleta", success: false }, { status: 500 })
    }

    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET)

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Email y contraseña son requeridos", success: false }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas", success: false }, { status: 401 })
    }

    if (user.state === "Inactivo" || user.state === "Suspendido" || user.state === "Eliminado") {
      return NextResponse.json({ error: "Cuenta inactiva o suspendida", success: false }, { status: 403 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json({ error: "Credenciales inválidas", success: false }, { status: 401 })
    }

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      role: user.role,
      dni: user.dni,
      name: user.name,
      lastname: user.lastname,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret)

    // ✅ CORREGIDO: Manejar rol S_A
    let redirectUrl: string
    if (user.role === "Admin" || user.role === "S_A") {
      redirectUrl = "/admin/dashboard"
    } else if (user.role === "Operador") {
      redirectUrl = `/despacho/${user.id}`
    } else {
      redirectUrl = "/"
    }

    const response = NextResponse.json({
      success: true,
      redirectUrl,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        dni: user.dni,
        name: user.name,
        lastname: user.lastname,
      },
    })

    ;(await cookies()).set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
      sameSite: "strict",
    })

    return response
  } catch (error: any) {
    console.error("Error al iniciar sesión:", error.message || error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        success: false,
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    )
  }
}