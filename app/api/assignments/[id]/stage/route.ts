import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const assignmentId = Number.parseInt(params.id)
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: "ID de asignación inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { stage, photoUrls, observations, timestamp } = body

    // Verify assignment exists and user has access
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { driver: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    // For now, we'll store stage documentation in the assignment notes
    // In a production system, you'd want a separate table for stage documentation
    const stageData = {
      stage,
      photoUrls,
      observations,
      timestamp,
      userId: payload.userId,
    }

    const existingNotes = assignment.notes ? JSON.parse(assignment.notes) : { stages: [] }
    if (!existingNotes.stages) {
      existingNotes.stages = []
    }

    // Add or update stage
    const existingStageIndex = existingNotes.stages.findIndex((s: any) => s.stage === stage)
    if (existingStageIndex >= 0) {
      existingNotes.stages[existingStageIndex] = stageData
    } else {
      existingNotes.stages.push(stageData)
    }

    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        notes: JSON.stringify(existingNotes),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Etapa documentada correctamente",
    })
  } catch (error) {
    console.error("Error documenting stage:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
