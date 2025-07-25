import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, dni, name, lastname, role = "Operador", state = "Activo", password } = body

    // Check if there are any users in the database
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    // If this is NOT the first user, check authentication and admin privileges
    if (!isFirstUser) {
      const cookieStore = await cookies()
      const token = cookieStore.get("token")?.value

      if (!token) {
        return NextResponse.json(
          {
            error: "Acceso denegado. Debe estar autenticado para registrar usuarios.",
            success: false,
          },
          { status: 401 },
        )
      }

      const adminUser = await verifyToken(token)
      if (!adminUser || (adminUser.role !== "Admin" && adminUser.role !== "S_A")) {
        return NextResponse.json(
          {
            error: "Acceso denegado. Solo administradores pueden registrar usuarios.",
            success: false,
          },
          { status: 403 },
        )
      }

      // Only S_A can create other S_A users
      if (role === "S_A" && adminUser.role !== "S_A") {
        return NextResponse.json(
          {
            error: "Solo Super Administradores pueden crear otros Super Administradores",
            success: false,
          },
          { status: 403 },
        )
      }
    } else {
      // For the first user, enforce Admin or S_A role
      if (role !== "Admin" && role !== "S_A") {
        return NextResponse.json(
          {
            error: "El primer usuario debe ser registrado como Admin o S_A",
            success: false,
          },
          { status: 400 },
        )
      }
    }

    // Manual validation of required fields
    if (!email?.trim() || !dni?.trim() || !name?.trim() || !lastname?.trim()) {
      return NextResponse.json(
        {
          error: "Email, DNI, nombre y apellido son requeridos",
          success: false,
        },
        { status: 400 },
      )
    }

    // Validate DNI format (8 digits)
    if (!/^\d{8}$/.test(dni.trim())) {
      return NextResponse.json(
        {
          error: "El DNI debe tener exactamente 8 dígitos numéricos",
          success: false,
        },
        { status: 400 },
      )
    }

    // Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        {
          error: "Por favor ingrese un correo electrónico válido",
          success: false,
        },
        { status: 400 },
      )
    }

    // Validate role against Prisma enum values
    const validRoles = ["Operador", "Admin", "S_A"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        {
          error: `Rol inválido. Los roles permitidos son: ${validRoles.join(", ")}`,
          success: false,
        },
        { status: 400 },
      )
    }

    // Validate state against Prisma enum values
    const validStates = ["Activo", "Inactivo", "Suspendido", "Eliminado", "Asignado"]
    if (!validStates.includes(state)) {
      return NextResponse.json(
        {
          error: `Estado inválido. Los estados permitidos son: ${validStates.join(", ")}`,
          success: false,
        },
        { status: 400 },
      )
    }

    // Check if user already exists by email or DNI
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email.toLowerCase().trim() }, { dni: dni.trim() }],
      },
    })

    if (existingUser) {
      const duplicateField = existingUser.email === email.toLowerCase().trim() ? "email" : "DNI"
      return NextResponse.json(
        {
          error: `Ya existe un usuario con ese ${duplicateField}`,
          success: false,
        },
        { status: 409 },
      )
    }

    // For first user, use DNI as default password. For subsequent users, use provided password or default to DNI
    const passwordToHash = password?.trim() || dni.trim()

    const hashedPassword = await bcrypt.hash(passwordToHash, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        dni: dni.trim(),
        email: email.toLowerCase().trim(),
        lastname: lastname.trim(),
        name: name.trim(),
        password: hashedPassword,
        role: role as "Operador" | "Admin" | "S_A",
        state: state as "Activo" | "Inactivo" | "Suspendido" | "Eliminado" | "Asignado",
      },
    })

    const message = isFirstUser 
      ? "Primer usuario administrador registrado exitosamente. La contraseña inicial será tu DNI. Podrás cambiarla después del primer login." 
      : "Usuario registrado exitosamente"

    return NextResponse.json({
      success: true,
      message,
      isFirstUser,
      passwordInfo: isFirstUser ? "La contraseña inicial es tu DNI. Podrás cambiarla después del primer login." : undefined,
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
    console.error("Error al registrar usuario:", error)
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
