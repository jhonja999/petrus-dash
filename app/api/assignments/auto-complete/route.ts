import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { driverId } = body

    if (!driverId) {
      return NextResponse.json({ error: "driverId es requerido" }, { status: 400 })
    }

    // Get today's date at midnight in local timezone
    const today = new Date()
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    console.log(`🔄 Auto-complete: Processing old assignments for driver ${driverId}`)
    console.log(`📅 Today midnight: ${todayMidnight.toISOString()}`)

    // Find all incomplete assignments from BEFORE today (not including today)
    const oldAssignments = await prisma.assignment.findMany({
      where: {
        driverId: Number.parseInt(driverId),
        isCompleted: false,
        createdAt: {
          lt: todayMidnight, // Strictly before today
        },
      },
      include: {
        clientAssignments: true,
      },
    })

    console.log(`📋 Auto-complete: Found ${oldAssignments.length} old incomplete assignments`)

    // Process each old assignment
    for (const assignment of oldAssignments) {
      // Only auto-complete if the assignment is truly old (more than 24 hours)
      const assignmentAge = todayMidnight.getTime() - new Date(assignment.createdAt).getTime()
      const oneDayInMs = 24 * 60 * 60 * 1000
      
      if (assignmentAge < oneDayInMs) {
        console.log(`⏭️ Skipping assignment #${assignment.id} - less than 24 hours old`)
        continue
      }

      // Mark all pending client assignments as expired
      await prisma.clientAssignment.updateMany({
        where: {
          assignmentId: assignment.id,
          status: "pending",
        },
        data: {
          status: "expired",
          deliveredQuantity: 0,
          remainingQuantity: 0,
        },
      })

      // Mark the assignment as completed
      await prisma.assignment.update({
        where: { id: assignment.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          notes: assignment.notes 
            ? `${assignment.notes} | Auto-completado el ${new Date().toLocaleDateString()}`
            : `Auto-completado el ${new Date().toLocaleDateString()}`,
        },
      })

      console.log(`✅ Auto-complete: Assignment #${assignment.id} marked as completed`)
    }

    return NextResponse.json({
      success: true,
      processedCount: oldAssignments.length,
      message: `Se procesaron ${oldAssignments.length} asignaciones antiguas`,
    })
  } catch (error) {
    console.error("❌ Auto-complete Error:", error)
    return NextResponse.json(
      { error: "Error al auto-completar asignaciones" },
      { status: 500 }
    )
  }
}