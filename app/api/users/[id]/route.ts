import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { hashPassword } from "@/lib/auth" // Assuming hashPassword is in lib/auth

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const userId = Number.parseInt(context.params.id) // Acceso correcto a params.id
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: "ID de usuario inválido" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        dni: true,
        role: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: "Usuario no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const userId = Number.parseInt(context.params.id) // Acceso correcto a params.id
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    if (isNaN(userId)) {
      return NextResponse.json({ success: false, message: "ID de usuario inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, lastname, email, dni, role, state, password } = body

    // Basic validation
    if (!name || !lastname || !email || !dni || !role || !state) {
      return NextResponse.json({ success: false, message: "Faltan campos obligatorios" }, { status: 400 })
    }
    if (!/^\d{8}$/.test(dni)) {
      return NextResponse.json({ success: false, message: "El DNI debe tener 8 dígitos numéricos" }, { status: 400 })
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ success: false, message: "Formato de correo electrónico inválido" }, { status: 400 })
    }

    // Only Super Admin can change role to S_A
    if (role === "S_A" && payload.role !== "S_A") {
      return NextResponse.json(
        { success: false, message: "Solo Super Administradores pueden asignar el rol S_A" },
        { status: 403 },
      )
    }

    const dataToUpdate: any = {
      name,
      lastname,
      email,
      dni,
      role,
      state,
    }

    // If password is provided, hash it. This is for cases where an admin might reset a password.
    // For a user to change their own password, a separate secure flow is recommended.
    if (password) {
      dataToUpdate.password = await hashPassword(password)
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        dni: true,
        role: true,
        state: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ success: true, data: updatedUser })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ success: false, message: "Error interno del servidor" }, { status: 500 })
  }
}
