import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Corrected import path

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
