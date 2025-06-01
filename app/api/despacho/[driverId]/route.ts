import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Corrected import path

export async function POST(request: Request, context: { params: { driverId: string } }) {
  const driverId = context.params.driverId

  if (!driverId) {
    return NextResponse.json({ error: "ID del conductor requerido" }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { assignmentId, customerId, totalDischarged } = body

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
    })

    if (!assignment || assignment.driverId !== Number.parseInt(driverId)) {
      return NextResponse.json({ error: "Asignación no encontrada o no coincide con el conductor" }, { status: 404 })
    }

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: Number.parseInt(customerId) },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Crear el despacho
    const newDischarge = await prisma.discharge.create({
      data: {
        totalDischarged: Number.parseFloat(totalDischarged),
        assignmentId: Number.parseInt(assignmentId),
        customerId: Number.parseInt(customerId),
      },
      include: {
        customer: true,
        assignment: true,
      },
    })

    // Actualizar el combustible restante en la asignación
    await prisma.assignment.update({
      where: { id: Number.parseInt(assignmentId) },
      data: {
        totalRemaining: {
          decrement: Number.parseFloat(totalDischarged),
        },
      },
    })

    return NextResponse.json(newDischarge, { status: 201 })
  } catch (error) {
    console.error("Error al crear el despacho:", error)
    return NextResponse.json(
      { error: "Error interno del servidor", details: (error as Error).message },
      { status: 500 },
    )
  }
}

// Mantén tu función GET existente
export async function GET(_request: Request, context: { params: { driverId: string } }) {
  const driverId = context.params.driverId
  console.log(driverId, "id del conductor")

  if (!driverId) {
    return NextResponse.json({ error: "ID del conductor requerido" }, { status: 400 })
  }

  try {
    const despachos = await prisma.discharge.findMany({
      where: {
        assignment: {
          is: {
            driverId: Number.parseInt(driverId),
          },
        },
      },
      include: {
        customer: true,
        assignment: true,
      },
    })
    console.log(despachos, "despachos")
    return NextResponse.json(despachos)
  } catch (error) {
    console.error("Error al obtener los despachos:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
