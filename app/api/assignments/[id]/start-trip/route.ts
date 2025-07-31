import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticación
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const assignmentId = Number.parseInt(params.id)

    // Verificar que la asignación existe y pertenece al usuario
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        driverId: authResult.user.id
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada o no autorizada" },
        { status: 404 }
      )
    }

    // Actualizar estado a "en_transito"
    const existingNotes = JSON.parse(assignment.notes || '{}')
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        status: 'IN_PROGRESS',
        notes: JSON.stringify({
          ...existingNotes,
          tripStarted: new Date().toISOString(),
          status: 'en_transito',
          lastUpdated: new Date().toISOString()
        })
      }
    })

    console.log(`🚛 Trip started for assignment ${assignmentId} by driver ${authResult.user.id}`)

    return NextResponse.json({
      success: true,
      message: "Trayecto iniciado correctamente",
      assignment: updatedAssignment
    })

  } catch (error) {
    console.error("Error starting trip:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
} 