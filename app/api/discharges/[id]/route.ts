import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers" // Correct import for cookies

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const discharge = await prisma.discharge.findUnique({
      where: { id: Number(id) },
      include: {
        assignment: true,
        customer: true,
      },
    })

    if (!discharge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    return NextResponse.json(discharge)
  } catch (error: any) {
    console.error("Error obteniendo despacho:", error.message || error)
    return NextResponse.json({ error: "Error al obtener el despacho", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { status, marcadorInicial, marcadorFinal, cantidadReal } = body

    // Get the discharge with related data
    const discharge = await prisma.discharge.findUnique({
      where: { id: Number(id) },
      include: {
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
        customer: true,
      },
    })

    if (!discharge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    // Update the discharge
    const updatedDischarge = await prisma.discharge.update({
      where: { id: Number(id) },
      data: {
        status: status,
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial) : null,
        marcadorFinal: marcadorFinal ? Number.parseFloat(marcadorFinal) : null,
        cantidadReal: cantidadReal ? Number.parseFloat(cantidadReal) : null,
        endTime: status === "finalizado" ? new Date() : null,
      },
      include: {
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
        customer: true,
      },
    })

    // If this is the final discharge and truck is empty, prepare for refill
    if (status === "finalizado") {
      const assignment = discharge.assignment

      // Check if all discharges for this assignment are completed
      const allDischarges = await prisma.discharge.findMany({
        where: { assignmentId: assignment.id },
      })

      const allCompleted = allDischarges.every((d) => d.status === "finalizado")

      // Convert Decimal to number for comparison
      const totalRemaining = Number.parseFloat(assignment.totalRemaining.toString())
      const truckEmpty = totalRemaining <= 0

      if (allCompleted && truckEmpty) {
        // Mark assignment as completed
        await prisma.assignment.update({
          where: { id: assignment.id },
          data: {
            isCompleted: true,
            completedAt: new Date(),
          },
        })

        // Reset truck state for refill (capacity of 3000)
        await prisma.truck.update({
          where: { id: assignment.truckId },
          data: {
            state: "Activo", // Ready for new assignment
            lastRemaining: 0, // Empty, ready for full refill
          },
        })

        console.log(`🚛 Truck ${assignment.truck.placa} completed route and is ready for refill`)
      }
    }

    return NextResponse.json(updatedDischarge)
  } catch (error: any) {
    console.error("Error updating discharge:", error.message || error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value // Correct usage of cookies()
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      // Only Admin or S_A can delete discharges
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden eliminar despachos." },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const deletedDischarge = await prisma.discharge.delete({
      where: { id: Number(id) },
    })

    return NextResponse.json({ message: "Despacho eliminado exitosamente", deletedDischarge })
  } catch (error: any) {
    console.error("Error deleting discharge:", error.message || error)
    return NextResponse.json({ error: "Error al eliminar despacho", details: error.message }, { status: 500 })
  }
}
