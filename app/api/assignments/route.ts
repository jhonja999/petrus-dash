import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const assignments = await prisma.assignment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        truck: true,
        driver: true,
        discharges: true,
      },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden crear asignaciones." },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { truckId, driverId, totalLoaded, fuelType, notes } = body

    // Manual validation
    if (
      !truckId ||
      !driverId ||
      !totalLoaded ||
      !fuelType ||
      isNaN(Number(truckId)) ||
      isNaN(Number(driverId)) ||
      isNaN(Number(totalLoaded)) ||
      Number(totalLoaded) <= 0
    ) {
      return NextResponse.json(
        { error: "Faltan campos requeridos o son inválidos (truckId, driverId, totalLoaded, fuelType)" },
        { status: 400 },
      )
    }

    // Check if truck and driver exist and are in 'Activo' state
    const truck = await prisma.truck.findUnique({ where: { id: Number(truckId) } })
    const driver = await prisma.user.findUnique({ where: { id: Number(driverId) } })

    if (!truck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }
    if (truck.state !== "Activo") {
      return NextResponse.json(
        { error: `El camión ${truck.placa} no está Activo. Estado actual: ${truck.state}` },
        { status: 400 },
      )
    }
    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado" }, { status: 404 })
    }
    if (driver.state !== "Activo") {
      return NextResponse.json(
        { error: `El conductor ${driver.name} ${driver.lastname} no está Activo. Estado actual: ${driver.state}` },
        { status: 400 },
      )
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        truckId: Number(truckId),
        driverId: Number(driverId),
        totalLoaded: Number.parseFloat(totalLoaded),
        totalRemaining: Number.parseFloat(totalLoaded),
        fuelType,
        notes: notes || null,
      },
    })

    // Update truck and driver state to 'Asignado'
    await prisma.truck.update({
      where: { id: Number(truckId) },
      data: { state: "Asignado" },
    })
    await prisma.user.update({
      where: { id: Number(driverId) },
      data: { state: "Asignado" },
    })

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error: any) {
    console.error("Error creating assignment:", error.message || error)
    return NextResponse.json({ error: "Error al crear asignación", details: error.message }, { status: 500 })
  }
}
