import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id } = await params
    const assignmentId = Number.parseInt(id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const clientAssignments = await prisma.clientAssignment.findMany({
      where: { assignmentId },
      include: {
        customer: true,
      },
    })

    return NextResponse.json(clientAssignments)
  } catch (error) {
    console.error("Error fetching client assignments:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const assignmentId = Number.parseInt(id)

    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { customerId, allocatedQuantity } = body

    if (!customerId || !allocatedQuantity) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    // Check if assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // Check if customer is already assigned to this assignment
    const existingAssignment = await prisma.clientAssignment.findFirst({
      where: {
        assignmentId,
        customerId: Number.parseInt(customerId),
      },
    })

    if (existingAssignment) {
      return NextResponse.json({ error: "Cliente ya asignado a esta ruta" }, { status: 400 })
    }

    // Create client assignment
    const clientAssignment = await prisma.clientAssignment.create({
      data: {
        assignmentId,
        customerId: Number.parseInt(customerId),
        allocatedQuantity: Number.parseFloat(allocatedQuantity),
        deliveredQuantity: 0,
        remainingQuantity: Number.parseFloat(allocatedQuantity),
        status: "pending",
      },
      include: {
        customer: true,
      },
    })

    return NextResponse.json(clientAssignment, { status: 201 })
  } catch (error) {
    console.error("Error creating client assignment:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
