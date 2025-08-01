// app/api/assignments/[id]/start-trip/route.ts
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
    if (!authResult.success || !authResult.user) {
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

    // Actualizar estado (sin el campo status por ahora hasta actualizar schema)
    const existingNotes = JSON.parse(assignment.notes || '{}')
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        // status: 'IN_PROGRESS', // Comentado hasta actualizar schema
        tripStartTime: new Date(),
        notes: JSON.stringify({
          ...existingNotes,
          tripStarted: new Date().toISOString(),
          status: 'en_transito', // Guardamos el status en notes por ahora
          lastUpdated: new Date().toISOString()
        })
      }
    })

    // Crear registro de trayecto
    const trip = await prisma.trip.create({
      data: {
        assignmentId: assignmentId,
        driverId: authResult.user.id,
        startTime: new Date(),
        status: 'IN_PROGRESS',
        route: [],
        totalDistance: 0
      }
    })

    console.log(`🚛 Trip started for assignment ${assignmentId} by driver ${authResult.user.id}`)

    return NextResponse.json({
      success: true,
      message: "Trayecto iniciado correctamente",
      assignment: updatedAssignment,
      tripId: trip.id
    })

  } catch (error) {
    console.error("Error starting trip:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}