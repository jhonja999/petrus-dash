import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Corrected import path
import { verifyToken } from "@/lib/jwt"

// GET - Obtener una asignación por ID
export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const id = context.params.id

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: Number(id) },
      include: {
        truck: true,
        driver: true,
        discharges: true,
      },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error obteniendo asignación:", error)
    return NextResponse.json({ error: "Error al obtener la asignación" }, { status: 500 })
  }
}


export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const dischargeId = Number.parseInt(params.id)

    const updatedDischarge = await prisma.discharge.update({
      where: { id: dischargeId },
      data: {
        status: body.status,
        marcadorInicial: body.marcadorInicial,
        marcadorFinal: body.marcadorFinal,
        cantidadReal: body.cantidadReal,
      },
      include: {
        customer: true,
        assignment: {
          include: {
            truck: true,
          },
        },
      },
    })

    // If discharge is finalized, update assignment's remaining fuel
    if (body.status === "finalizado") {
      const assignment = updatedDischarge.assignment
      const newRemaining = Number.parseFloat(assignment.totalRemaining.toString()) - body.cantidadReal

      await prisma.assignment.update({
        where: { id: assignment.id },
        data: { totalRemaining: Math.max(0, newRemaining) },
      })

      // Update truck's last remaining for next day
      await prisma.truck.update({
        where: { id: assignment.truckId },
        data: { lastRemaining: Math.max(0, newRemaining) },
      })
    }

    return NextResponse.json(updatedDischarge)
  } catch (error) {
    console.error("Error updating discharge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
