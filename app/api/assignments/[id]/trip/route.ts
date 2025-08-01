// app/api/assignments/[id]/trip/route.ts
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

    const { id } = params
    const { action, driverId, startTime, endTime, route, totalDistance } = await request.json()

    // Verificar que la asignación existe y pertenece al conductor
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: parseInt(id),
        driverId: parseInt(driverId)
      },
      include: {
        driver: true,
        truck: true,
        clientAssignments: {
          include: {
            customer: true
          }
        }
      }
    })

    if (!assignment) {
      return NextResponse.json(
        { error: "Asignación no encontrada o no autorizada" },
        { status: 404 }
      )
    }

    if (action === 'start') {
      // Iniciar trayecto
      const existingNotes = typeof assignment.notes === 'string' ? JSON.parse(assignment.notes) : (assignment.notes || {})
      
      const updatedAssignment = await prisma.assignment.update({
        where: { id: parseInt(id) },
        data: {
          // status: 'IN_PROGRESS', // Comentado hasta actualizar schema
          tripStartTime: startTime ? new Date(startTime) : new Date(),
          notes: JSON.stringify({
            ...existingNotes,
            tripStarted: true,
            tripStartTime: startTime || new Date().toISOString(),
            status: 'IN_PROGRESS' // Guardamos en notes por ahora
          })
        }
      })

      // Crear registro de trayecto
      const trip = await prisma.trip.create({
        data: {
          assignmentId: parseInt(id),
          driverId: parseInt(driverId),
          startTime: startTime ? new Date(startTime) : new Date(),
          status: 'IN_PROGRESS',
          route: route || [],
          totalDistance: totalDistance || 0
        }
      })

      return NextResponse.json({
        success: true,
        message: "Trayecto iniciado correctamente",
        tripId: trip.id,
        assignment: updatedAssignment
      })

    } else if (action === 'end') {
      // Finalizar trayecto
      const existingNotes = typeof assignment.notes === 'string' ? JSON.parse(assignment.notes) : (assignment.notes || {})
      
      const updatedAssignment = await prisma.assignment.update({
        where: { id: parseInt(id) },
        data: {
          // status: 'COMPLETED', // Comentado hasta actualizar schema
          tripEndTime: endTime ? new Date(endTime) : new Date(),
          notes: JSON.stringify({
            ...existingNotes,
            tripCompleted: true,
            tripEndTime: endTime || new Date().toISOString(),
            totalDistance: totalDistance || 0,
            status: 'COMPLETED' // Guardamos en notes por ahora
          })
        }
      })

      // Actualizar registro de trayecto
      const trip = await prisma.trip.updateMany({
        where: {
          assignmentId: parseInt(id),
          status: 'IN_PROGRESS'
        },
        data: {
          endTime: endTime ? new Date(endTime) : new Date(),
          status: 'COMPLETED',
          route: route || [],
          totalDistance: totalDistance || 0
        }
      })

      return NextResponse.json({
        success: true,
        message: "Trayecto finalizado correctamente",
        assignment: updatedAssignment
      })

    } else {
      return NextResponse.json(
        { error: "Acción no válida. Use 'start' o 'end'" },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error("Error en trip endpoint:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function GET(
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

    const { id } = params

    // Obtener información del trayecto
    const trip = await prisma.trip.findFirst({
      where: {
        assignmentId: parseInt(id),
        status: 'IN_PROGRESS'
      },
      include: {
        assignment: {
          include: {
            driver: true,
            truck: true,
            clientAssignments: {
              include: {
                customer: true
              }
            }
          }
        }
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: "Trayecto no encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      trip
    })

  } catch (error) {
    console.error("Error obteniendo trayecto:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}