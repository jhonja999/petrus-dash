import { type NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { email, dni, name, lastname, role = "Operador", state = "Activo" } = body

    // Manual validation of required fields
    if (!email?.trim() || !dni?.trim() || !name?.trim() || !lastname?.trim()) {
      return NextResponse.json({ error: "Todos los campos son requeridos", success: false }, { status: 400 })
    }

    // Validate DNI format (8 digits)
    if (!/^\d{8}$/.test(dni.trim())) {
      return NextResponse.json(
        { error: "El DNI debe tener exactamente 8 dígitos numéricos", success: false },
        { status: 400 },
      )
    }

    // Validate Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Por favor ingrese un correo electrónico válido", success: false },
        { status: 400 },
      )
    }

    // ✅ CORREGIDO: Validate role against Prisma enum values - INCLUYE S_A
    const validRoles = ["Operador", "Admin", "S_A"]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Rol inválido. Los roles permitidos son: ${validRoles.join(", ")}`, success: false },
        { status: 400 },
      )
    }

    // Validate state against Prisma enum values
    const validStates = ["Activo", "Inactivo", "Suspendido", "Eliminado", "Asignado"]
    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: `Estado inválido. Los estados permitidos son: ${validStates.join(", ")}`, success: false },
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
        { error: `Ya existe un usuario con ese ${duplicateField}`, success: false },
        { status: 409 },
      )
    }

    // Hash DNI as initial password
    const hashedPassword = await bcrypt.hash(dni.trim(), 12)

    // ✅ CORREGIDO: Create user with proper role casting including S_A
    const user = await prisma.user.create({
      data: {
        dni: dni.trim(),
        email: email.toLowerCase().trim(),
        lastname: lastname.trim(),
        name: name.trim(),
        password: hashedPassword,
        role: role as "Operador" | "Admin" | "S_A", // ✅ INCLUYE S_A
        state: state as "Activo" | "Inactivo" | "Suspendido" | "Eliminado" | "Asignado",
      },
    })

    return NextResponse.json({
      success: true,
      message: "Usuario registrado exitosamente",
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
    console.error("Error al registrar usuario:", error.message || error)
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