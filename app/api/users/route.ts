import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getUserFromToken } from "@/lib/jwt"
import { hashPassword } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getUserFromToken()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin access
    if (user.role !== "Admin" && user.role !== "S_A") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    // Map frontend role names to database role names
    const roleMapping: { [key: string]: string } = {
      conductor: "Operador",
      operador: "Operador",
      admin: "Admin",
      s_a: "S_A",
    }

    const mappedRole = role ? roleMapping[role.toLowerCase()] : null
    const whereClause = mappedRole ? { role: mappedRole as any } : {}

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getUserFromToken()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin access
    if (user.role !== "Admin" && user.role !== "S_A") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { dni, name, lastname, email, password, role, state } = body

    // Validate required fields
    if (!dni || !name || !lastname || !email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Only S_A can create other S_A users
    if (role === "S_A" && user.role !== "S_A") {
      return NextResponse.json({ error: "Only Super Admins can create other Super Admins" }, { status: 403 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { dni }],
      },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email or DNI already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        dni,
        name,
        lastname,
        email,
        password: hashedPassword,
        role: role as any,
        state: state || "Activo",
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

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
