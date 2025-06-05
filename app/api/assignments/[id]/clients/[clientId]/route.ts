import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  try {
    const { id, clientId } = await params
    const assignmentId = Number.parseInt(id)
    const clientAssignmentId = Number.parseInt(clientId)

    if (isNaN(assignmentId) || isNaN(clientAssignmentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const clientAssignment = await prisma.clientAssignment.findFirst({
      where: {
        id: clientAssignmentId,
        assignmentId,
      },
      include: {
        customer: true,
      },
    })

    if (!clientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    return NextResponse.json(clientAssignment)
  } catch (error: any) {
    console.error("Error fetching client assignment:", error.message || error)
    return NextResponse.json(
      { error: "Error al obtener asignación de cliente", details: error.message },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id, clientId } = await params
    const assignmentId = Number.parseInt(id)
    const clientAssignmentId = Number.parseInt(clientId)

    if (isNaN(assignmentId) || isNaN(clientAssignmentId)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

    const body = await request.json()
    const { status, deliveredQuantity, allocatedQuantity } = body

    // Get current client assignment to calculate remaining quantity
    const currentClientAssignment = await prisma.clientAssignment.findUnique({
      where: { id: clientAssignmentId },
    })

    if (!currentClientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    // Calculate remaining quantity
    const allocated = allocatedQuantity
      ? Number.parseFloat(allocatedQuantity)
      : Number.parseFloat(currentClientAssignment.allocatedQuantity.toString())
    const delivered = deliveredQuantity
      ? Number.parseFloat(deliveredQuantity)
      : Number.parseFloat(currentClientAssignment.deliveredQuantity.toString())
    const remaining = allocated - delivered

    // Update the client assignment
    const updatedClientAssignment = await prisma.clientAssignment.update({
      where: { id: clientAssignmentId },
      data: {
        status,
        deliveredQuantity: delivered,
        remainingQuantity: remaining,
        allocatedQuantity: allocatedQuantity ? Number.parseFloat(allocatedQuantity) : undefined,
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json(updatedClientAssignment)
  } catch (error) {
    console.error("Error updating client assignment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id, clientId } = await params
    const assignmentId = Number.parseInt(id)
    const clientAssignmentId = Number.parseInt(clientId)

    if (isNaN(assignmentId) || isNaN(clientAssignmentId)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

    // Check if client assignment exists and belongs to the assignment
    const clientAssignment = await prisma.clientAssignment.findFirst({
      where: {
        id: clientAssignmentId,
        assignmentId,
      },
    })

    if (!clientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    // Only allow deletion if status is pending
    if (clientAssignment.status !== "pending") {
      return NextResponse.json(
        { error: "No se puede eliminar una asignación que ya está en progreso o completada" },
        { status: 400 },
      )
    }

    // Delete the client assignment
    await prisma.clientAssignment.delete({
      where: { id: clientAssignmentId },
    })

    return NextResponse.json({ message: "Asignación de cliente eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting client assignment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
