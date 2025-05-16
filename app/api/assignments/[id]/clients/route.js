import { NextResponse } from "next/server"
import prisma from "@/libs/prismadb"

// POST - Asignar clientes a una asignación
export async function POST(request, { params }) {
  try {
    const { id } = params
    const { clientAssignments } = await request.json()

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    // Verificar que la asignación existe
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(id) },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Crear o actualizar las asignaciones de clientes
    const results = await Promise.all(
      clientAssignments.map(async (item) => {
        return prisma.clientAssignment.upsert({
          where: {
            assignmentId_clientId: {
              assignmentId: Number(id),
              clientId: item.clientId,
            },
          },
          update: {
            allocatedAmount: item.allocatedAmount,
            notes: item.notes || "",
          },
          create: {
            assignmentId: Number(id),
            clientId: item.clientId,
            allocatedAmount: item.allocatedAmount,
            notes: item.notes || "",
          },
        })
      }),
    )

    return NextResponse.json({
      message: "Clientes asignados correctamente",
      data: results,
    })
  } catch (error) {
    console.error("Error asignando clientes:", error)
    return NextResponse.json({ error: "Error al asignar clientes" }, { status: 500 })
  }
}

// GET - Obtener clientes asignados a una asignación
export async function GET(request, { params }) {
  try {
    const { id } = params

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const clientAssignments = await prisma.clientAssignment.findMany({
      where: { assignmentId: Number(id) },
      include: {
        client: true,
      },
    })

    return NextResponse.json(clientAssignments)
  } catch (error) {
    console.error("Error obteniendo clientes asignados:", error)
    return NextResponse.json({ error: "Error al obtener clientes asignados" }, { status: 500 })
  }
}
