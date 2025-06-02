import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers" // Correct import for cookies

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value // Correct usage of cookies()
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    // Assuming only Admin, Operador, or S_A can create discharges
    if (!payload || (payload.role !== "Admin" && payload.role !== "Operador" && payload.role !== "S_A")) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores u operadores pueden crear despachos." },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { assignmentId, customerId, totalDischarged, status, marcadorInicial, marcadorFinal, cantidadReal } = body

    // Manual validation
    if (
      !assignmentId ||
      !customerId ||
      !totalDischarged ||
      isNaN(Number(assignmentId)) ||
      isNaN(Number(customerId)) ||
      isNaN(Number(totalDischarged)) ||
      Number(totalDischarged) <= 0
    ) {
      return NextResponse.json(
        { error: "Faltan campos requeridos o son inválidos (assignmentId, customerId, totalDischarged)" },
        { status: 400 },
      )
    }

    // Optional fields validation
    if (marcadorInicial !== undefined && isNaN(Number(marcadorInicial))) {
      return NextResponse.json({ error: "marcadorInicial debe ser un número" }, { status: 400 })
    }
    if (marcadorFinal !== undefined && isNaN(Number(marcadorFinal))) {
      return NextResponse.json({ error: "marcadorFinal debe ser un número" }, { status: 400 })
    }
    if (cantidadReal !== undefined && isNaN(Number(cantidadReal))) {
      return NextResponse.json({ error: "cantidadReal debe ser un número" }, { status: 400 })
    }
    if (status !== undefined && typeof status !== "string") {
      return NextResponse.json({ error: "status debe ser una cadena de texto" }, { status: 400 })
    }

    // Check if assignment and customer exist
    const assignment = await prisma.assignment.findUnique({ where: { id: Number(assignmentId) } })
    const customer = await prisma.customer.findUnique({ where: { id: Number(customerId) } })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }
    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    const discharge = await prisma.discharge.create({
      data: {
        assignmentId: Number(assignmentId),
        customerId: Number(customerId),
        totalDischarged: Number.parseFloat(totalDischarged),
        status: status || "pendiente", // Default to "pendiente" if not provided
        marcadorInicial: marcadorInicial ? Number.parseFloat(marcadorInicial) : null,
        marcadorFinal: marcadorFinal ? Number.parseFloat(marcadorFinal) : null,
        cantidadReal: cantidadReal ? Number.parseFloat(cantidadReal) : null,
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

    // Update totalRemaining in the assignment
    await prisma.assignment.update({
      where: { id: Number(assignmentId) },
      data: {
        totalRemaining: {
          decrement: Number.parseFloat(totalDischarged),
        },
      },
    })

    return NextResponse.json(discharge, { status: 201 })
  } catch (error: any) {
    console.error("Error creating discharge:", error.message || error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}
