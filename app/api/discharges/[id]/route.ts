import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const dischargeId = Number.parseInt(id)

    const discharge = await prisma.discharge.findUnique({
      where: { id: dischargeId },
      include: {
        customer: true,
        assignment: true,
      },
    })

    if (!discharge) {
      return new Response(JSON.stringify({ message: "Discharge not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(discharge), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching discharge:", error)
    return new Response(JSON.stringify({ message: "Error fetching discharge" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
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
      const assignment = await prisma.assignment.findUnique({
        where: { id: updatedDischarge.assignmentId },
      })

      if (assignment) {
        const newRemaining = Number(assignment.totalRemaining) - (body.cantidadReal || body.totalDischarged)

        await prisma.assignment.update({
          where: { id: assignment.id },
          data: { totalRemaining: Math.max(0, newRemaining) },
        })

        // Check if all discharges are completed
        const allDischarges = await prisma.discharge.findMany({
          where: { assignmentId: assignment.id },
        })

        const allCompleted = allDischarges.every((d) => d.status === "finalizado")

        if (allCompleted) {
          // Mark assignment as completed and update truck's last remaining
          await prisma.assignment.update({
            where: { id: assignment.id },
            data: { isCompleted: true },
          })

          await prisma.truck.update({
            where: { id: assignment.truckId },
            data: {
              lastRemaining: Math.max(0, newRemaining),
              state: "Activo", // Reset truck state when assignment is completed
            },
          })
        }
      }
    }

    return NextResponse.json(updatedDischarge)
  } catch (error) {
    console.error("Error updating discharge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== "admin") {
      // Solo admin puede eliminar
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dischargeId = Number.parseInt(params.id)

    const discharge = await prisma.discharge.delete({
      where: { id: dischargeId },
    })

    return NextResponse.json({ message: "Discharge deleted successfully", dischargeId: discharge.id })
  } catch (error) {
    console.error("Error deleting discharge:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
