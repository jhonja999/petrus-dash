import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    // Get the assignment with truck information
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        truck: true,
        driver: true,
        clientAssignments: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Check if all client assignments are completed
    const allClientAssignmentsCompleted = assignment.clientAssignments.every(
      (clientAssignment) => clientAssignment.status === "delivered",
    )

    if (!allClientAssignmentsCompleted) {
      return NextResponse.json(
        { error: "No se puede completar la asignación. Algunos clientes aún no han recibido su combustible." },
        { status: 400 },
      )
    }

    // Mark assignment as completed
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      },
      include: {
        truck: true,
        driver: true,
      },
    })

    // 🚛 UPDATE TRUCK STATUS TO ACTIVE
    await prisma.truck.update({
      where: { id: assignment.truckId },
      data: {
        state: "Activo",
      },
    })

    console.log(`✅ Assignment ${assignmentId} completed and truck ${assignment.truck.placa} set to Activo`)

    return NextResponse.json({
      message: "Asignación completada exitosamente",
      assignment: updatedAssignment,
      truckUpdated: true,
    })
  } catch (error: any) {
    console.error("Error completing assignment:", error.message || error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}
