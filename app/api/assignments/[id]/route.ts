import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth" // Assuming you have a verifyAuth utility

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        truck: true,
        driver: true,
        discharges: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return NextResponse.json({ error: "Error al obtener la asignación" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.isValid || auth.payload?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = Number(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { truckId, driverId, totalLoaded, totalRemaining, fuelType, isCompleted, notes } = body

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        truckId: truckId ? Number(truckId) : undefined,
        driverId: driverId ? Number(driverId) : undefined,
        totalLoaded: totalLoaded ? Number.parseFloat(totalLoaded) : undefined,
        totalRemaining: totalRemaining ? Number.parseFloat(totalRemaining) : undefined,
        fuelType: fuelType || undefined,
        isCompleted: typeof isCompleted === "boolean" ? isCompleted : undefined,
        notes: notes || undefined,
      },
    })

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: "Error al actualizar la asignación" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(request)
    if (!auth.isValid || auth.payload?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = Number(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    // Delete related discharges first due to foreign key constraint
    await prisma.discharge.deleteMany({
      where: { assignmentId: id },
    })

    const deletedAssignment = await prisma.assignment.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Asignación eliminada correctamente", deletedAssignment })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Error al eliminar la asignación" }, { status: 500 })
  }
}
