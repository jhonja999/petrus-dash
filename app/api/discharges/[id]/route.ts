import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id } = params
    const dischargeId = Number.parseInt(id)

    if (isNaN(dischargeId)) {
      return NextResponse.json({ error: "ID de despacho inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { status, marcadorInicial, marcadorFinal, cantidadReal } = body

    // Validar que los campos necesarios estén presentes
    if (status === "finalizado" && (!marcadorInicial || !marcadorFinal)) {
      return NextResponse.json(
        { error: "Para finalizar un despacho, se requieren los marcadores inicial y final" },
        { status: 400 },
      )
    }

    // Obtener el despacho actual
    const discharge = await prisma.discharge.findUnique({
      where: { id: dischargeId },
      include: {
        assignment: true,
      },
    })

    if (!discharge) {
      return NextResponse.json({ error: "Despacho no encontrado" }, { status: 404 })
    }

    // Actualizar el despacho
    const updatedDischarge = await prisma.discharge.update({
      where: { id: dischargeId },
      data: {
        status,
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial) : discharge.marcadorInicial,
        marcadorFinal: marcadorFinal ? Number.parseFloat(marcadorFinal) : discharge.marcadorFinal,
        cantidadReal: cantidadReal ? Number.parseFloat(cantidadReal) : discharge.cantidadReal,
        endTime: status === "finalizado" ? new Date() : discharge.endTime,
      },
      include: {
        assignment: {
          include: {
            discharges: true,
          },
        },
      },
    })

    // Verificar si todos los despachos de la asignación están finalizados
    if (status === "finalizado" && updatedDischarge.assignment) {
      const allDischarges = updatedDischarge.assignment.discharges
      const allFinalized = allDischarges.every((d) => d.status === "finalizado")

      if (allFinalized) {
        console.log(`✅ Todos los despachos de la asignación ${discharge.assignmentId} están finalizados`)

        // Marcar la asignación como completada
        const updatedAssignment = await prisma.assignment.update({
          where: { id: discharge.assignmentId },
          data: {
            isCompleted: true,
            completedAt: new Date(),
          },
          include: {
            truck: true,
          },
        })

        // Actualizar el estado del camión a Activo
        if (updatedAssignment.truck) {
          await prisma.truck.update({
            where: { id: updatedAssignment.truckId },
            data: {
              state: "Activo",
            },
          })

          console.log(
            `🚛 Camión ${updatedAssignment.truck.placa} actualizado a estado Activo tras completar asignación`,
          )
        }
      }
    }

    return NextResponse.json(updatedDischarge)
  } catch (error) {
    console.error("Error al actualizar el despacho:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const dischargeId = Number.parseInt(id)

    if (isNaN(dischargeId)) {
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
    console.error("Error al obtener el despacho:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
