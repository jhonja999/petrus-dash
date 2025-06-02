import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(id) },
      include: {
        truck: true,
        driver: true,
        discharges: {
          include: {
            customer: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error: any) {
    console.error("Error obteniendo asignación:", error.message || error)
    return NextResponse.json({ error: "Error al obtener la asignación", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Solo administradores pueden actualizar asignaciones.",
        },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { truckId, driverId, totalLoaded, totalRemaining, fuelType, isCompleted, notes } = body

    // Manual validation and update data construction
    const updateData: { [key: string]: any } = {}
    if (truckId !== undefined) {
      if (isNaN(Number(truckId))) return NextResponse.json({ error: "truckId debe ser un número" }, { status: 400 })
      updateData.truckId = Number(truckId)
    }
    if (driverId !== undefined) {
      if (isNaN(Number(driverId))) return NextResponse.json({ error: "driverId debe ser un número" }, { status: 400 })
      updateData.driverId = Number(driverId)
    }
    if (totalLoaded !== undefined) {
      if (isNaN(Number(totalLoaded)))
        return NextResponse.json({ error: "totalLoaded debe ser un número" }, { status: 400 })
      updateData.totalLoaded = Number.parseFloat(totalLoaded)
    }
    if (totalRemaining !== undefined) {
      if (isNaN(Number(totalRemaining)))
        return NextResponse.json({ error: "totalRemaining debe ser un número" }, { status: 400 })
      updateData.totalRemaining = Number.parseFloat(totalRemaining)
    }
    if (fuelType !== undefined) {
      const validFuelTypes = ["DIESEL_B5", "GASOLINA_90", "GASOLINA_95", "GLP", "ELECTRICA"]
      if (!validFuelTypes.includes(fuelType))
        return NextResponse.json({ error: "Tipo de combustible inválido" }, { status: 400 })
      updateData.fuelType = fuelType
    }
    if (isCompleted !== undefined) {
      if (typeof isCompleted !== "boolean")
        return NextResponse.json({ error: "isCompleted debe ser un booleano" }, { status: 400 })
      updateData.isCompleted = isCompleted
    }
    if (notes !== undefined) updateData.notes = notes

    const updatedAssignment = await prisma.assignment.update({
      where: { id: Number(id) },
      data: updateData,
    })

    // If assignment is marked as completed, update truck and driver states to 'Activo'
    if (isCompleted === true) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: Number(id) },
      })
      if (assignment) {
        await prisma.truck.update({
          where: { id: assignment.truckId },
          data: { state: "Activo" },
        })
        await prisma.user.update({
          where: { id: assignment.driverId },
          data: { state: "Activo" },
        })
      }
    }

    return NextResponse.json(updatedAssignment)
  } catch (error: any) {
    console.error("Error updating assignment:", error.message || error)
    return NextResponse.json({ error: "Error al actualizar asignación", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Solo administradores pueden eliminar asignaciones.",
        },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    // Delete associated discharges first to maintain referential integrity
    await prisma.discharge.deleteMany({
      where: { assignmentId: Number(id) },
    })

    const deletedAssignment = await prisma.assignment.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({
      message: "Asignación eliminada exitosamente",
      deletedAssignment,
    })
  } catch (error: any) {
    console.error("Error deleting assignment:", error.message || error)
    return NextResponse.json({ error: "Error al eliminar asignación", details: error.message }, { status: 500 })
  }
}
