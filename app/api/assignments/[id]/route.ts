import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const assignmentId = Number.parseInt(id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        driver: true,
        truck: true,
        discharges: {
          include: {
            customer: true,
          },
        },
        clientAssignments: {
          include: {
            customer: true,
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Transform the response to match the expected format in the frontend
    const responseData = {
      ...assignment,
      dispatches: assignment.discharges || [],
    }

    return NextResponse.json(responseData)
  } catch (error: any) {
    console.error("Error fetching assignment:", error.message || error)
    return NextResponse.json({ error: "Error al obtener la asignación", details: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id } = await params
    const assignmentId = Number.parseInt(id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { isCompleted, notes } = body

    // Update the assignment
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        isCompleted,
        notes,
        completedAt: isCompleted ? new Date() : null,
      },
      include: {
        driver: true,
        truck: true,
        discharges: {
          include: {
            customer: true,
          },
        },
        clientAssignments: {
          include: {
            customer: true,
          },
        },
      },
    })

    // Transform the response to match the expected format in the frontend
    const responseData = {
      ...updatedAssignment,
      dispatches: updatedAssignment.discharges || [],
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("Error updating assignment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const assignmentId = Number.parseInt(id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    // Check if assignment has discharges
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        discharges: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    if (assignment.discharges && assignment.discharges.length > 0) {
      return NextResponse.json(
        { error: "No se puede eliminar una asignación con despachos registrados" },
        { status: 400 },
      )
    }

    // Delete the assignment
    await prisma.assignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({ message: "Asignación eliminada exitosamente" })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
