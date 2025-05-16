import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import type { TruckState } from "@prisma/client"
import { isAdmin, isConductor } from "@/lib/auth"

// GET: Fetch all trucks or filter by query params
export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Check if user has valid role
    if (!isAdmin(userRole) && !isConductor(userRole)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const state = searchParams.get("state") as TruckState | null
    const typefuel = searchParams.get("typefuel")
    const placa = searchParams.get("placa")

    // Build filter object based on query params
    const filter: any = {}
    if (state) filter.state = state
    if (typefuel) filter.typefuel = typefuel
    if (placa) filter.placa = { contains: placa }

    const trucks = await db.truck.findMany({
      where: filter,
      orderBy: { id: "desc" },
      include: {
        Assignment: {
          include: {
            driver: true,
            discharges: true,
          },
        },
      },
    })

    return NextResponse.json(trucks)
  } catch (error) {
    console.error("[TRUCKS_GET]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// POST: Create a new truck
export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Only admins can create trucks
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    const body = await req.json()
    const { placa, typefuel, capacitygal } = body

    if (!placa || !typefuel || !capacitygal) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    // Check if truck with same placa already exists
    const existingTruck = await db.truck.findUnique({
      where: { placa },
    })

    if (existingTruck) {
      return NextResponse.json({ error: "Ya existe un camión con esta placa" }, { status: 409 })
    }

    const truck = await db.truck.create({
      data: {
        placa,
        typefuel,
        capacitygal,
        state: "Activo",
      },
    })

    return NextResponse.json(truck)
  } catch (error) {
    console.error("[TRUCKS_POST]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// PATCH: Update a truck
export async function PATCH(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Only admins can update trucks
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    const body = await req.json()
    const { id, placa, typefuel, capacitygal, state } = body

    if (!id) {
      return NextResponse.json({ error: "ID del camión es requerido" }, { status: 400 })
    }

    // Check if truck exists
    const existingTruck = await db.truck.findUnique({
      where: { id: Number(id) },
    })

    if (!existingTruck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    // Check if new placa conflicts with another truck
    if (placa && placa !== existingTruck.placa) {
      const placaExists = await db.truck.findUnique({
        where: { placa },
      })

      if (placaExists) {
        return NextResponse.json({ error: "Ya existe un camión con esta placa" }, { status: 409 })
      }
    }

    const updatedTruck = await db.truck.update({
      where: { id: Number(id) },
      data: {
        placa: placa || undefined,
        typefuel: typefuel || undefined,
        capacitygal: capacitygal !== undefined ? capacitygal : undefined,
        state: (state as TruckState) || undefined,
      },
    })

    return NextResponse.json(updatedTruck)
  } catch (error) {
    console.error("[TRUCKS_PATCH]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

// DELETE: Delete a truck
export async function DELETE(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Only admins can delete trucks
    if (!isAdmin(userRole)) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID del camión es requerido" }, { status: 400 })
    }

    // Check if truck has assignments
    const assignmentsCount = await db.assignment.count({
      where: { truckId: Number(id) },
    })

    if (assignmentsCount > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar el camión porque tiene asignaciones asociadas" },
        { status: 409 },
      )
    }

    await db.truck.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ message: "Camión eliminado correctamente" })
  } catch (error) {
    console.error("[TRUCKS_DELETE]", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
