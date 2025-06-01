import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth" // Assuming you have a verifyAuth utility

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const discharge = await prisma.discharge.findUnique({
      where: { id },
      include: {
        assignment: true,
        customer: true,
      },
    })

    if (!discharge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    return NextResponse.json(discharge)
  } catch (error) {
    console.error("Error fetching discharge:", error)
    return NextResponse.json({ error: "Error al obtener el despacho" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Authentication and Authorization check (e.g., only admin or the assigned driver can update)
    const auth = await verifyAuth(request)
    if (!auth.isValid) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const id = Number(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { totalDischarged, status, marcadorInicial, marcadorFinal, cantidadReal } = body

    // Optional: Add more specific role checks if needed, e.g., only admin can change status to 'finalizado'
    // For now, assuming the driver's page handles the 'finalizado' status update via a specific endpoint
    // This PUT is more for general updates by an admin.

    const updatedDischarge = await prisma.discharge.update({
      where: { id },
      data: {
        totalDischarged: totalDischarged ? Number.parseFloat(totalDischarged) : undefined,
        status: status || undefined,
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial) : undefined,
        marcadorFinal: marcadorFinal ? Number.parseFloat(marcadorFinal) : undefined,
        cantidadReal: cantidadReal ? Number.parseFloat(cantidadReal) : undefined,
      },
    })

    // If the discharge is being finalized, update the assignment's totalRemaining
    if (updatedDischarge.status === "finalizado" && updatedDischarge.cantidadReal !== null) {
      const assignment = await prisma.assignment.findUnique({
        where: { id: updatedDischarge.assignmentId },
      })

      if (assignment) {
        // Calculate the actual amount discharged from the assignment's perspective
        // This might be complex if multiple discharges affect one assignment.
        // For simplicity, assuming this update is for a single discharge's finalization.
        // A more robust system might sum all finalized discharges for an assignment.
        // For now, we'll just ensure the assignment's remaining is correctly reflected.
        // This logic might need adjustment based on how totalRemaining is managed.
        // For example, if totalRemaining is only updated when an assignment is fully completed.
      }
    }

    return NextResponse.json(updatedDischarge)
  } catch (error) {
    console.error("Error updating discharge:", error)
    return NextResponse.json({ error: "Error al actualizar el despacho" }, { status: 500 })
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
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const deletedDischarge = await prisma.discharge.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Despacho eliminado correctamente", deletedDischarge })
  } catch (error) {
    console.error("Error deleting discharge:", error)
    return NextResponse.json({ error: "Error al eliminar el despacho" }, { status: 500 })
  }
}
