import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(request: Request, context: { params: { id: string; clientId: string } }) {
  try {
    const params = await context.params
    const { id: assignmentId, clientId } = params
    const body = await request.json()
    const { status, deliveredQuantity, marcadorInicial, marcadorFinal } = body

    console.log(`📝 Updating client assignment ${clientId} for assignment ${assignmentId}`)
    console.log(`📊 Request body:`, body)
    console.log(`📊 URL params:`, { assignmentId, clientId })

    // Validate input
    if (!status) {
      return NextResponse.json({ error: "status es requerido" }, { status: 400 })
    }

    if (!deliveredQuantity || isNaN(Number(deliveredQuantity)) || Number(deliveredQuantity) <= 0) {
      return NextResponse.json({ error: "deliveredQuantity debe ser un número válido mayor a 0" }, { status: 400 })
    }

    // Get the client assignment with assignment details
    const clientAssignment = await prisma.clientAssignment.findUnique({
      where: {
        id: Number(clientId),
      },
      include: {
        assignment: {
          include: {
            truck: true,
            driver: true,
          },
        },
        customer: true,
      },
    })

    console.log(`📊 Found client assignment:`, {
      id: clientAssignment?.id,
      assignmentId: clientAssignment?.assignmentId,
      expectedAssignmentId: Number(assignmentId),
      status: clientAssignment?.status,
    })

    if (!clientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    // Verify it belongs to the correct assignment
    if (clientAssignment.assignmentId !== Number(assignmentId)) {
      console.log(`❌ Assignment ID mismatch:`, {
        clientAssignmentId: clientAssignment.assignmentId,
        expectedAssignmentId: Number(assignmentId),
      })
      return NextResponse.json(
        {
          error: `La asignación de cliente pertenece a la asignación ${clientAssignment.assignmentId}, no a la ${assignmentId}`,
        },
        { status: 400 },
      )
    }

    // Verify the assignment is not completed
    if (clientAssignment.assignment.isCompleted) {
      return NextResponse.json({ error: "No se puede modificar una asignación completada" }, { status: 400 })
    }

    // Verify the client assignment is not already completed
    if (clientAssignment.status === "completed") {
      return NextResponse.json({ error: "Esta entrega ya está completada" }, { status: 400 })
    }

    const deliveredAmount = Number(deliveredQuantity)
    const allocatedAmount = Number(clientAssignment.allocatedQuantity)

    // Calculate remaining quantity for this specific client assignment
    const remainingQuantity = Math.max(0, allocatedAmount - deliveredAmount)

    console.log(`📊 Delivery calculation:`, {
      allocated: allocatedAmount,
      delivered: deliveredAmount,
      remaining: remainingQuantity,
    })

    // Update the client assignment
    const updatedClientAssignment = await prisma.clientAssignment.update({
      where: {
        id: Number(clientId),
      },
      data: {
        status: status,
        deliveredQuantity: deliveredAmount,
        remainingQuantity: remainingQuantity,
        marcadorInicial: marcadorInicial ? Number(marcadorInicial) : null,
        marcadorFinal: marcadorFinal ? Number(marcadorFinal) : null,
        completedAt: status === "completed" ? new Date() : null,
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

    // Update the assignment's total remaining quantity
    const currentAssignment = await prisma.assignment.findUnique({
      where: { id: Number(assignmentId) },
      select: { totalRemaining: true },
    })

    if (currentAssignment) {
      const newTotalRemaining = Math.max(0, Number(currentAssignment.totalRemaining) - deliveredAmount)

      await prisma.assignment.update({
        where: {
          id: Number(assignmentId),
        },
        data: {
          totalRemaining: newTotalRemaining,
          updatedAt: new Date(),
        },
      })

      console.log(`📊 Assignment ${assignmentId} total remaining updated to: ${newTotalRemaining}`)
    }

    // Check if all client assignments for this assignment are completed
    const allClientAssignments = await prisma.clientAssignment.findMany({
      where: {
        assignmentId: Number(assignmentId),
      },
    })

    const allCompleted = allClientAssignments.every((ca) => ca.status === "completed" || ca.status === "expired")

    // If all client assignments are completed, mark the main assignment as completed
    if (allCompleted) {
      console.log(`✅ All client assignments completed for assignment ${assignmentId}. Marking as completed.`)

      await prisma.assignment.update({
        where: {
          id: Number(assignmentId),
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      })
    }

    console.log(`✅ Client assignment ${clientId} updated successfully`)

    // Return the updated client assignment with all necessary data
    return NextResponse.json({
      success: true,
      clientAssignment: updatedClientAssignment,
      message: "Entrega completada exitosamente",
    })
  } catch (error) {
    console.error("❌ Error updating client assignment:", error)

    // More detailed error logging
    if (error instanceof Error) {
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
      })
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al actualizar la asignación de cliente",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, context: { params: { id: string; clientId: string } }) {
  try {
    const params = await context.params
    const { id: assignmentId, clientId } = params

    console.log(`🗑️ Deleting client assignment ${clientId} from assignment ${assignmentId}`)

    // Get the client assignment
    const clientAssignment = await prisma.clientAssignment.findUnique({
      where: {
        id: Number(clientId),
      },
      include: {
        assignment: true,
      },
    })

    if (!clientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    // Verify it belongs to the correct assignment
    if (clientAssignment.assignmentId !== Number(assignmentId)) {
      return NextResponse.json({ error: "La asignación de cliente no pertenece a esta asignación" }, { status: 400 })
    }

    // Verify the assignment is not completed
    if (clientAssignment.assignment.isCompleted) {
      return NextResponse.json({ error: "No se puede eliminar de una asignación completada" }, { status: 400 })
    }

    // Verify the client assignment is not completed
    if (clientAssignment.status === "completed") {
      return NextResponse.json({ error: "No se puede eliminar una entrega completada" }, { status: 400 })
    }

    // Delete the client assignment
    await prisma.clientAssignment.delete({
      where: {
        id: Number(clientId),
      },
    })

    console.log(`✅ Client assignment ${clientId} deleted successfully`)

    return NextResponse.json({ success: true, message: "Asignación de cliente eliminada exitosamente" })
  } catch (error) {
    console.error("❌ Error deleting client assignment:", error)
    return NextResponse.json({ error: "Error al eliminar la asignación de cliente" }, { status: 500 })
  }
}
