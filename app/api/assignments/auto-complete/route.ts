import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Obtener parámetros del cuerpo
    const body = await request.json()
    const { driverId } = body

    if (!driverId) {
      return NextResponse.json({ error: "Se requiere el ID del conductor" }, { status: 400 })
    }

    console.log(`🔄 Auto-complete: Processing old assignments for driver ${driverId}`)

    // Obtener la fecha de hoy a medianoche
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    console.log(`📅 Today midnight: ${today.toISOString()}`)

    // Buscar asignaciones antiguas incompletas (más de 24 horas)
    const oldIncompleteAssignments = await prisma.assignment.findMany({
      where: {
        driverId: Number.parseInt(driverId),
        isCompleted: false,
        createdAt: {
          lt: today, // Asignaciones creadas antes de hoy
        },
      },
      include: {
        truck: true,
        discharges: true,
        clientAssignments: true,
      },
    })

    console.log(`📋 Auto-complete: Found ${oldIncompleteAssignments.length} old incomplete assignments`)

    if (oldIncompleteAssignments.length === 0) {
      return NextResponse.json({
        message: "No hay asignaciones antiguas para completar",
        completedCount: 0,
      })
    }

    // Completar asignaciones antiguas
    const completedAssignments = []

    for (const assignment of oldIncompleteAssignments) {
      // Verificar la edad de la asignación (debe ser más de 24 horas)
      const assignmentAge = today.getTime() - new Date(assignment.createdAt).getTime()
      const oneDayInMs = 24 * 60 * 60 * 1000

      if (assignmentAge < oneDayInMs) {
        console.log(`⏭️ Skipping assignment #${assignment.id} - less than 24 hours old`)
        continue
      }

      // Marcar todas las asignaciones de cliente pendientes como expiradas
      await prisma.clientAssignment.updateMany({
        where: {
          assignmentId: assignment.id,
          status: "pending",
        },
        data: {
          status: "expired",
          deliveredQuantity: 0,
          remainingQuantity: 0,
        },
      })

      // Marcar todos los despachos pendientes como finalizados
      await prisma.discharge.updateMany({
        where: {
          assignmentId: assignment.id,
          status: "pendiente",
        },
        data: {
          status: "finalizado",
          endTime: new Date(),
        },
      })

      // Marcar la asignación como completada
      const updatedAssignment = await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          notes: assignment.notes
            ? `${assignment.notes} | Auto-completado el ${new Date().toLocaleDateString()}`
            : `Auto-completado el ${new Date().toLocaleDateString()}`,
        },
      })

      // Actualizar el estado del camión a Activo
      await prisma.truck.update({
        where: { id: assignment.truckId },
        data: {
          state: "Activo",
        },
      })

      console.log(
        `✅ Auto-complete: Assignment #${assignment.id} completed and truck ${assignment.truck.placa} set to Activo`,
      )

      completedAssignments.push(updatedAssignment)
    }

    return NextResponse.json({
      message: `${completedAssignments.length} asignaciones antiguas completadas automáticamente`,
      completedCount: completedAssignments.length,
      completedAssignments,
    })
  } catch (error) {
    console.error("Error al auto-completar asignaciones:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
