import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, context: { params: { id: string } }) {
  try {
    const params = await context.params
    const dischargeId = Number.parseInt(params.id)

    if (!dischargeId) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const body = await request.json()

    // Validar campos
    const validStatuses = ["pendiente", "en_proceso", "finalizado", "cancelado"]
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    // Obtener el despacho actual para validaciones
    const currentDischarge = await prisma.discharge.findUnique({
      where: { id: dischargeId },
      include: {
        assignment: true,
      },
    })

    if (!currentDischarge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    // Preparar datos para actualizar
    const updateData: any = {
      updatedAt: new Date(),
    }

    // Si se está finalizando el despacho
    if (body.status === "finalizado") {
      updateData.status = "finalizado"
      updateData.endTime = new Date()

      if (body.marcadorInicial !== undefined) {
        updateData.marcadorInicial = Number.parseFloat(body.marcadorInicial)
      }

      if (body.marcadorFinal !== undefined) {
        updateData.marcadorFinal = Number.parseFloat(body.marcadorFinal)
      }

      if (body.cantidadReal !== undefined) {
        updateData.cantidadReal = Number.parseFloat(body.cantidadReal)
      }
    } else {
      // Para otros campos que se puedan actualizar
      if (body.totalDischarged !== undefined) {
        updateData.totalDischarged = Number.parseFloat(body.totalDischarged)
      }

      if (body.status !== undefined) {
        updateData.status = body.status
      }

      if (body.marcadorInicial !== undefined) {
        updateData.marcadorInicial = Number.parseFloat(body.marcadorInicial)
      }

      if (body.marcadorFinal !== undefined) {
        updateData.marcadorFinal = Number.parseFloat(body.marcadorFinal)
      }

      if (body.cantidadReal !== undefined) {
        updateData.cantidadReal = Number.parseFloat(body.cantidadReal)
      }
    }

    // Actualizar el despacho
    const updatedDischarge = await prisma.discharge.update({
      where: { id: dischargeId },
      data: updateData,
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
      },
    })

    // Si se finalizó el despacho, verificar si la asignación debe completarse
    if (body.status === "finalizado") {
      const assignment = await prisma.assignment.findUnique({
        where: { id: currentDischarge.assignmentId },
        include: {
          discharges: true,
        },
      })

      if (assignment) {
        // Verificar si todos los despachos están finalizados
        const allFinalized = assignment.discharges.every((d) =>
          d.id === dischargeId ? true : d.status === "finalizado",
        )

        // Si todos están finalizados o el combustible restante es 0, completar la asignación
        if (allFinalized || Number(assignment.totalRemaining) <= 0) {
          await prisma.assignment.update({
            where: { id: assignment.id },
            data: {
              isCompleted: true,
              completedAt: new Date(),
            },
          })
        }
      }
    }

    return NextResponse.json(updatedDischarge)
  } catch (error) {
    console.error("Error al actualizar despacho:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: "Error interno del servidor", details: errorMessage }, { status: 500 })
  }
}

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const params = await context.params
    const dischargeId = Number.parseInt(params.id)

    if (!dischargeId) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const discharge = await prisma.discharge.findUnique({
      where: { id: dischargeId },
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
      },
    })

    if (!discharge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    return NextResponse.json(discharge)
  } catch (error) {
    console.error("Error al obtener despacho:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}