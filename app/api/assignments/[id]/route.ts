import { type NextRequest, NextResponse } from "next/server"
import {prisma} from "@/lib/prisma"
import { getUserFromToken, isOperator, isAdmin } from "@/lib/jwt"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const assignmentId = Number(params.id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        truck: true,
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            dni: true,
            email: true,
          },
        },
        discharges: {
          include: {
            customer: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Verificar permisos
    // Si es operador, solo puede ver sus propias asignaciones
    if (isOperator(user) && assignment.driverId !== user.id) {
      return NextResponse.json({ error: "No autorizado para ver esta asignación" }, { status: 403 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error obteniendo asignación:", error)
    return NextResponse.json({ error: "Error al obtener la asignación" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromToken()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Solo administradores pueden actualizar asignaciones
    if (!isAdmin(user)) {
      return NextResponse.json({ error: "No autorizado para actualizar asignaciones" }, { status: 403 })
    }

    const assignmentId = Number(params.id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const data = await request.json()

    // Validar datos
    if (!data) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    // Actualizar asignación
    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        totalRemaining: data.totalRemaining !== undefined ? data.totalRemaining : undefined,
        isCompleted: data.isCompleted !== undefined ? data.isCompleted : undefined,
        notes: data.notes !== undefined ? data.notes : undefined,
      },
      include: {
        truck: true,
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            dni: true,
            email: true,
          },
        },
        discharges: {
          include: {
            customer: true,
          },
        },
      },
    })

    return NextResponse.json(updatedAssignment)
  } catch (error) {
    console.error("Error actualizando asignación:", error)
    return NextResponse.json({ error: "Error al actualizar la asignación" }, { status: 500 })
  }
}
