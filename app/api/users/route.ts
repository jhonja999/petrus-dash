import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import type { Role, UserState } from "@prisma/client"
import { isAdmin } from "@/lib/auth"

// GET: Fetch all users or filter by query params
export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Allow both admins and conductors to view users, but with different filters
    if (!userRole || (userRole !== "admin" && userRole !== "conductor")) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const role = searchParams.get("role") as Role | null
    const state = searchParams.get("state") as UserState | null
    const name = searchParams.get("name")

    // Build filter object based on query params
    const filter: any = {}
    if (role) filter.role = role
    if (state) filter.state = state
    if (name) filter.name = { contains: name }

    // If user is not admin, only show active users
    if (userRole !== "admin") {
      filter.state = "Activo"
    }

    const users = await db.user.findMany({
      where: filter,
      orderBy: { id: "desc" },
      include: {
        Assignment: true,
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error("[USERS_GET]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// POST: Create a new user
export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can create users
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { dni, name, lastname, email, role, state } = body

    if (!dni || !name || !lastname || !email || !role) {
      return new NextResponse("Faltan campos requeridos", { status: 400 })
    }

    // Check if user with same DNI or email already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [{ dni }, { email }],
      },
    })

    if (existingUser) {
      if (existingUser.dni === dni) {
        return new NextResponse("Ya existe un usuario con este DNI", { status: 409 })
      }
      if (existingUser.email === email) {
        return new NextResponse("Ya existe un usuario con este email", { status: 409 })
      }
    }

    const user = await db.user.create({
      data: {
        dni,
        name,
        lastname,
        email,
        role: role as Role,
        state: (state as UserState) || "Activo",
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("[USERS_POST]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// PATCH: Update a user
export async function PATCH(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can update users
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { id, dni, name, lastname, email, role, state } = body

    if (!id) {
      return new NextResponse("ID del usuario es requerido", { status: 400 })
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { id: Number(id) },
    })

    if (!existingUser) {
      return new NextResponse("Usuario no encontrado", { status: 404 })
    }

    // Check if new DNI or email conflicts with another user
    if ((dni && dni !== existingUser.dni) || (email && email !== existingUser.email)) {
      const conflictUser = await db.user.findFirst({
        where: {
          OR: [dni ? { dni } : {}, email ? { email } : {}],
          NOT: {
            id: Number(id),
          },
        },
      })

      if (conflictUser) {
        if (dni && conflictUser.dni === dni) {
          return new NextResponse("Ya existe un usuario con este DNI", { status: 409 })
        }
        if (email && conflictUser.email === email) {
          return new NextResponse("Ya existe un usuario con este email", { status: 409 })
        }
      }
    }

    const updatedUser = await db.user.update({
      where: { id: Number(id) },
      data: {
        dni: dni || undefined,
        name: name || undefined,
        lastname: lastname || undefined,
        email: email || undefined,
        role: (role as Role) || undefined,
        state: (state as UserState) || undefined,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error("[USERS_PATCH]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// DELETE: Delete a user
export async function DELETE(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can delete users
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return new NextResponse("ID del usuario es requerido", { status: 400 })
    }

    // Check if user has assignments
    const assignmentsCount = await db.assignment.count({
      where: { driverId: Number(id) },
    })

    if (assignmentsCount > 0) {
      return new NextResponse("No se puede eliminar el usuario porque tiene asignaciones asociadas", { status: 409 })
    }

    await db.user.delete({
      where: { id: Number(id) },
    })

    return new NextResponse("Usuario eliminado correctamente")
  } catch (error) {
    console.error("[USERS_DELETE]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}
