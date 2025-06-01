import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { UserSchema } from "@/lib/zod-schemas"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the input data
    const validatedData = UserSchema.parse({
      dni: body.dni,
      name: body.name,
      lastname: body.lastname,
      email: body.email,
      role: body.role,
      state: body.state || "Activo",
    })

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: validatedData.email }, { dni: validatedData.dni }],
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "Usuario ya existe con este email o DNI" }, { status: 409 })
    }

    // Hash the password (using DNI as initial password)
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(body.password || body.dni, saltRounds)

    // Create the user
    const user = await prisma.user.create({
      data: {
        ...validatedData,
        password: hashedPassword,
      },
      select: {
        id: true,
        dni: true,
        name: true,
        lastname: true,
        email: true,
        role: true,
        state: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Usuario creado exitosamente",
      user,
    })
  } catch (error) {
    console.error("Error creating user:", error)

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Datos de entrada inválidos" }, { status: 400 })
    }

    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
