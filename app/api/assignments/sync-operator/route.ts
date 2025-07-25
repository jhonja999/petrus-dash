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

    const body = await request.json()
    const { driverId } = body

    if (!driverId) {
      return NextResponse.json({ error: "Se requiere el ID del conductor" }, { status: 400 })
    }

    console.log(`🔄 Sync-Operator: Sincronizando datos para conductor ${driverId}`)

    // 1. Verificar y actualizar estados de camiones basado en asignaciones completadas
    const completedAssignments = await prisma.assignment.findMany({
      where: {
        driverId: Number(driverId),
        isCompleted: true,
      },
      include: {
        truck: true,
      },
    })

    for (const assignment of completedAssignments) {
      if (assignment.truck.state !== "Activo") {
        await prisma.truck.update({
          where: { id: assignment.truckId },
          data: { state: "Activo" },
        })
        console.log(`🚛 Truck ${assignment.truck.placa} updated to Activo`)
      }
    }

    // 2. Sincronizar asignaciones de clientes con despachos
    const activeAssignments = await prisma.assignment.findMany({
      where: {
        driverId: Number(driverId),
        isCompleted: false,
      },
      include: {
        clientAssignments: true,
        discharges: true,
      },
    })

    for (const assignment of activeAssignments) {
      // Verificar si todas las entregas están completadas
      const allClientAssignmentsCompleted = assignment.clientAssignments.every(
        (ca) => ca.status === "completed" || ca.status === "expired",
      )

      const allDischargesCompleted = assignment.discharges.every((d) => d.status === "finalizado")

      // Si todo está completado, marcar la asignación como completada
      // Convertir Decimal a número para la comparación
      const remainingFuel = Number(assignment.totalRemaining)

      if ((allClientAssignmentsCompleted || allDischargesCompleted) && remainingFuel <= 0) {
        await prisma.assignment.update({
          where: { id: assignment.id },
          data: {
            isCompleted: true,
            completedAt: new Date(),
          },
        })
        console.log(`✅ Assignment #${assignment.id} marked as completed`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Datos sincronizados correctamente",
    })
  } catch (error) {
    console.error("❌ Sync-Operator Error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
