import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken, isAdmin, isOperator } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: Request, { params }: { params: { driverId: string } }) {
  const driverId = params.driverId

  if (!driverId) {
    return NextResponse.json({ error: "ID del conductor requerido" }, { status: 400 })
  }

  try {
    // Verify authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check permissions: operators can only access their own data, admins can access all
    if (isOperator(user) && !isAdmin(user) && user.id !== Number.parseInt(driverId)) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Solo puedes acceder a tu propio panel.",
        },
        { status: 403 },
      )
    }

    const discharges = await prisma.discharge.findMany({
      where: {
        assignment: {
          driverId: Number.parseInt(driverId),
        },
      },
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
            driver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                dni: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(discharges)
  } catch (error) {
    console.error("Error al obtener los despachos:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: { params: { driverId: string } }) {
  const driverId = params.driverId

  if (!driverId) {
    return NextResponse.json({ error: "ID del conductor requerido" }, { status: 400 })
  }

  try {
    // Verify authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check permissions
    if (isOperator(user) && !isAdmin(user) && user.id !== Number.parseInt(driverId)) {
      return NextResponse.json(
        {
          error: "Acceso denegado. Solo puedes crear despachos en tu propio panel.",
        },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { assignmentId, customerId, totalDischarged, marcadorInicial, marcadorFinal } = body

    // Validation
    if (!assignmentId || !customerId || !totalDischarged) {
      return NextResponse.json(
        {
          error: "Faltan campos requeridos (assignmentId, customerId, totalDischarged)",
        },
        { status: 400 },
      )
    }

    if (isNaN(totalDischarged) || totalDischarged <= 0) {
      return NextResponse.json(
        {
          error: "La cantidad despachada debe ser un número positivo",
        },
        { status: 400 },
      )
    }

    // Verify assignment exists and belongs to the driver
    const assignment = await prisma.assignment.findUnique({
      where: { id: Number.parseInt(assignmentId) },
    })

    if (!assignment || assignment.driverId !== Number.parseInt(driverId)) {
      return NextResponse.json(
        {
          error: "Asignación no encontrada o no coincide con el conductor",
        },
        { status: 404 },
      )
    }

    // Check if there's enough fuel remaining
    if (Number(assignment.totalRemaining) < Number.parseFloat(totalDischarged)) {
      return NextResponse.json(
        {
          error: `Cantidad insuficiente. Solo quedan ${Number(assignment.totalRemaining)} galones disponibles.`,
        },
        { status: 400 },
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: Number.parseInt(customerId) },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Create discharge
    const newDischarge = await prisma.discharge.create({
      data: {
        totalDischarged: Number.parseFloat(totalDischarged),
        assignmentId: Number.parseInt(assignmentId),
        customerId: Number.parseInt(customerId),
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial) : null,
        marcadorFinal: marcadorFinal ? Number.parseFloat(marcadorFinal) : null,
        cantidadReal:
          marcadorFinal && marcadorInicial
            ? Number.parseFloat(marcadorFinal) - Number.parseFloat(marcadorInicial)
            : null,
      },
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
            driver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                dni: true,
              },
            },
          },
        },
      },
    })

    // Update remaining fuel in assignment
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
      {
        error: "Error interno del servidor",
        details: (error as Error).message,
      },
      { status: 500 },
    )
  }
}
