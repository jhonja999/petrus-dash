import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request, context: { params: { driverId: string } }) {
  const params = await context.params
  const driverId = params.driverId

  if (!driverId) {
    return NextResponse.json({ error: "ID del conductor requerido" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { assignmentId, customerId, totalDischarged, marcadorInicial } = body

    // Validaciones básicas
    if (!assignmentId || !customerId || !totalDischarged) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (assignmentId, customerId, totalDischarged)" },
        { status: 400 },
      )
    }

    if (isNaN(totalDischarged) || totalDischarged <= 0) {
      return NextResponse.json({ error: "La cantidad despachada debe ser un número positivo" }, { status: 400 })
    }

    // Verificar que la asignación existe y pertenece al conductor
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number.parseInt(assignmentId) },
      include: {
        truck: true,
        driver: true,
      },
    })

    if (!assignment || assignment.driverId !== Number.parseInt(driverId)) {
      return NextResponse.json({ error: "Asignación no encontrada o no coincide con el conductor" }, { status: 404 })
    }

    // Verificar que hay suficiente combustible
    if (totalDischarged > Number(assignment.totalRemaining)) {
      return NextResponse.json(
        { error: `No hay suficiente combustible. Disponible: ${assignment.totalRemaining} gal` },
        { status: 400 },
      )
    }

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: Number.parseInt(customerId) },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Crear el despacho con marcador inicial
    const newDischarge = await prisma.discharge.create({
      data: {
        totalDischarged: Number.parseFloat(totalDischarged),
        assignmentId: Number.parseInt(assignmentId),
        customerId: Number.parseInt(customerId),
        status: "pendiente",
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial) : null,
        startTime: new Date(),
      },
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

    // Actualizar el combustible restante en la asignación
    const updatedAssignment = await prisma.assignment.update({
      where: { id: Number.parseInt(assignmentId) },
      data: {
        totalRemaining: {
          decrement: Number.parseFloat(totalDischarged),
        },
      },
    })

    // Verificar si la asignación debe marcarse como completada
    if (Number(updatedAssignment.totalRemaining) <= 0) {
      await prisma.assignment.update({
        where: { id: Number.parseInt(assignmentId) },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      })
    }

    return NextResponse.json(newDischarge, { status: 201 })
  } catch (error) {
    console.error("Error al crear el despacho:", error)
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    return NextResponse.json({ error: "Error interno del servidor", details: errorMessage }, { status: 500 })
  }
}

export async function GET(_request: Request, context: { params: { driverId: string } }) {
  const params = await context.params
  const driverId = params.driverId
  console.log(driverId, "id del conductor")

  if (!driverId) {
    return NextResponse.json({ error: "ID del conductor requerido" }, { status: 400 })
  }

  try {
    // Obtener la fecha de hoy
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const despachos = await prisma.discharge.findMany({
      where: {
        assignment: {
          driverId: Number.parseInt(driverId),
        },
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(despachos, "despachos del día")
    return NextResponse.json(despachos)
  } catch (error) {
    console.error("Error al obtener los despachos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}