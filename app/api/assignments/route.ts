import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth" // Assuming you have a verifyAuth utility

export async function GET() {
  try {
    const assignments = await prisma.assignment.findMany({
      include: {
        truck: true,
        driver: true,
        discharges: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Error al obtener asignaciones" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.isValid || auth.payload?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { truckId, driverId, totalLoaded, fuelType, notes } = body

    if (!truckId || !driverId || !totalLoaded || !fuelType) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        truckId: Number(truckId),
        driverId: Number(driverId),
        totalLoaded: Number.parseFloat(totalLoaded),
        totalRemaining: Number.parseFloat(totalLoaded), // Initially totalRemaining is same as totalLoaded
        fuelType,
        notes,
        isCompleted: false,
      },
    })

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Error al crear la asignación" }, { status: 500 })
  }
}
