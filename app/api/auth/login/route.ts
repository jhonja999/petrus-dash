import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { signToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET no está configurado")
      return NextResponse.json(
        {
          error: "Configuración del servidor incompleta",
          success: false,
        },
        { status: 500 },
      )
    }

    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    // Validation
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json(
        {
          error: "Email y contraseña son requeridos",
          success: false,
        },
        { status: 400 },
      )
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      return NextResponse.json(
        {
          error: "Credenciales inválidas",
          success: false,
        },
        { status: 401 },
      )
    }

    // Check user state
    if (user.state === "Inactivo" || user.state === "Suspendido" || user.state === "Eliminado") {
      return NextResponse.json(
        {
          error: `Cuenta ${user.state.toLowerCase()}. Contacte al administrador del sistema.`,
          success: false,
        },
        { status: 403 },
      )
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        {
          error: "Credenciales inválidas",
          success: false,
        },
        { status: 401 },
      )
    }

    // Create JWT token
    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      dni: user.dni,
      name: user.name,
      lastname: user.lastname,
      state: user.state,
    }

    const token = await signToken(tokenPayload)

    // Determine redirect URL based on role
    let redirectUrl: string
    if (user.role === "Admin" || user.role === "S_A") {
      redirectUrl = "/dashboard"
    } else if (user.role === "Operador") {
      redirectUrl = `/despacho/${user.id}`
    } else {
      redirectUrl = "/"
    }

    // Set cookie
    const cookieStore = await cookies()
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "strict",
    })

    return NextResponse.json({
      success: true,
      redirectUrl,
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
    console.error("Error al iniciar sesión:", error)
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
