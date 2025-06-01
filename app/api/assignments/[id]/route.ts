import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const assignmentId = Number.parseInt(id)

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        truck: true,
        driver: true,
        discharges: {
          include: {
            customer: true,
          },
        },
      },
    })

    if (!assignment) {
      return new Response(JSON.stringify({ message: "Assignment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify(assignment), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error fetching assignment:", error)
    return new Response(JSON.stringify({ message: "Error fetching assignment" }), {
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
    if (!payload || payload.role !== "admin") {
      // Solo admin puede actualizar
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const assignmentId = Number.parseInt(params.id)
    const body = await request.json()

    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: body,
      include: {
        truck: true,
        driver: true,
        discharges: {
          include: {
            customer: true,
          },
        },
      },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error updating assignment:", error)
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

    const assignmentId = Number.parseInt(params.id)

    // Primero, eliminar los despachos asociados a esta asignación
    await prisma.discharge.deleteMany({
      where: { assignmentId: assignmentId },
    })

    const assignment = await prisma.assignment.delete({
      where: { id: assignmentId },
    })

    return NextResponse.json({ message: "Assignment deleted successfully", assignmentId: assignment.id })
  } catch (error) {
    console.error("Error deleting assignment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
