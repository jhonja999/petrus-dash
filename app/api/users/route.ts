import { type NextRequest, NextResponse } from "next/server"
import {prisma} from "@/lib/prisma"
import { getUserFromToken } from "@/lib/jwt"
import { hashPassword } from "@/lib/auth"

// GET /api/users - Obtener todos los usuarios
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const user = await getUserFromToken()
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Solo Admin y S_A pueden listar usuarios
    if (user.role !== "Admin" && user.role !== "S_A") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener parámetros de consulta
    const url = new URL(request.url)
    const role = url.searchParams.get("role")

    // Construir la consulta
    const whereClause: any = {}

    // Filtrar por rol si se especifica
    if (role) {
      // Mapear "conductor" a "Operador" para compatibilidad con frontend
      if (role.toLowerCase() === "conductor") {
        whereClause.role = "Operador"
      } else {
        whereClause.role = role
      }
    }

    // Obtener usuarios
    const users = await prisma.user.findMany({
      where: whereClause,
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
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 })
  }
}

// POST /api/users - Crear un nuevo usuario
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const currentUser = await getUserFromToken()
    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // Solo Admin y S_A pueden crear usuarios
    if (currentUser.role !== "Admin" && currentUser.role !== "S_A") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener datos del cuerpo de la solicitud
    const body = await request.json()
    const { name, lastname, email, dni, password, role, state } = body

    // Validaciones básicas
    if (!name || !lastname || !email || !dni || !password) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 })
    }

    // Validar que solo S_A puede crear otros S_A
    if (role === "S_A" && currentUser.role !== "S_A") {
      return NextResponse.json(
        { error: "Solo Super Administradores pueden crear otros Super Administradores" },
        { status: 403 },
      )
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 })
    }

    // Verificar si el DNI ya existe
    const existingDni = await prisma.user.findFirst({
      where: { dni },
    })

    if (existingDni) {
      return NextResponse.json({ error: "El DNI ya está registrado" }, { status: 400 })
    }

    // Hashear la contraseña
    const hashedPassword = await hashPassword(password)

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        lastname,
        email,
        dni,
        password: hashedPassword,
        role: role || "Operador", // Default a Operador si no se especifica
        state: state || "Activo", // Default a Activo si no se especifica
      },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        dni: true,
        role: true,
        state: true,
        createdAt: true,
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 })
  }
}
