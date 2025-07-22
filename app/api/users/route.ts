import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const state = searchParams.get("state")
    const search = searchParams.get("search")

    console.log("🔍 Users API called with params:", { role, state, search })

    const whereClause: any = {}

    if (role) {
      const upperCaseRole = (role as string).toUpperCase()
      console.log("🎯 Filtering by role:", upperCaseRole)

      // Ensure the role from query is a valid enum value
      const validRoles = Object.values(Role)
      if (validRoles.includes(upperCaseRole as Role)) {
        whereClause.role = upperCaseRole as Role
      } else {
        console.warn(`❌ Invalid role query parameter: ${role}`)
        return NextResponse.json({ error: "Invalid role filter" }, { status: 400 })
      }
    }

    if (state) {
      whereClause.state = state
      console.log("🎯 Filtering by state:", state)
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { lastname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { dni: { contains: search, mode: "insensitive" } },
      ]
    }

    console.log("📋 Final where clause:", JSON.stringify(whereClause, null, 2))

    const users = await prisma.user.findMany({
      where: whereClause,
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
      orderBy: [{ name: "asc" }, { lastname: "asc" }],
    })

    console.log(`✅ Found ${users.length} users matching criteria`)
    console.log(
      "👥 Users found:",
      users.map((u) => ({ id: u.id, name: `${u.name} ${u.lastname}`, role: u.role, state: u.state })),
    )

    return NextResponse.json(users)
  } catch (error) {
    console.error("❌ Error fetching users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name, lastname, email, dni, role, password, state } = await request.json()

    if (!name || !lastname || !email || !dni || !role || !password || !state) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 })
    }

    // Ensure role is a valid enum value and convert to uppercase
    const finalRole = (role as string).toUpperCase() as Role
    const validRoles = Object.values(Role)
    if (!validRoles.includes(finalRole)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        lastname,
        email,
        dni,
        role: finalRole,
        password, // In a real app, hash this password!
        state,
      },
    })

    console.log("✅ New user created:", { id: newUser.id, name: newUser.name, role: newUser.role })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}
