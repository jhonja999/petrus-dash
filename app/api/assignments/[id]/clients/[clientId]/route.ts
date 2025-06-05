import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: Request,
  context: { params: { assignmentId: string; clientId: string } }
) {
  try {
    const params = await context.params
    const { assignmentId, clientId } = params
    const body = await request.json()
    const { status, deliveredQuantity, marcadorInicial, marcadorFinal } = body

    console.log(`📝 Updating client assignment ${clientId} for assignment ${assignmentId}`)

    // Validate input
    if (!status || !deliveredQuantity) {
      return NextResponse.json(
        { error: "status y deliveredQuantity son requeridos" },
        { status: 400 }
      )
    }

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
      return NextResponse.json(
        { error: "Asignación de cliente no encontrada" },
        { status: 404 }
      )
    }

    // Verify it belongs to the correct assignment
    if (clientAssignment.assignmentId !== Number(assignmentId)) {
      return NextResponse.json(
        { error: "La asignación de cliente no pertenece a esta asignación" },
        { status: 400 }
      )
    }

    // Verify the assignment is not completed
    if (clientAssignment.assignment.isCompleted) {
      return NextResponse.json(
        { error: "No se puede modificar una asignación completada" },
        { status: 400 }
      )
    }

    // Update the client assignment with markers
    const updatedClientAssignment = await prisma.clientAssignment.update({
      where: {
        id: Number(clientId),
      },
      data: {
        status: status,
        deliveredQuantity: Number(deliveredQuantity),
        remainingQuantity: Number(clientAssignment.allocatedQuantity) - Number(deliveredQuantity),
        marcadorInicial: marcadorInicial ? Number(marcadorInicial) : undefined,
        marcadorFinal: marcadorFinal ? Number(marcadorFinal) : undefined,
        completedAt: status === "completed" ? new Date() : undefined,
      },
      include: {
        customer: true,
      },
    })

    // Update the assignment's remaining quantity
    const totalDelivered = Number(deliveredQuantity)
    await prisma.assignment.update({
      where: {
        id: Number(assignmentId),
      },
      data: {
        totalRemaining: {
          decrement: totalDelivered,
        },
      },
    })

    // Check if all client assignments are completed
    const allClientAssignments = await prisma.clientAssignment.findMany({
      where: {
        assignmentId: Number(assignmentId),
      },
    })

    const allCompleted = allClientAssignments.every(ca => ca.status === "completed" || ca.status === "expired")
    
    if (allCompleted) {
      await prisma.assignment.update({
        where: {
          id: Number(assignmentId),
        },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      })
    }

    console.log(`✅ Client assignment ${clientId} updated successfully`)

    return NextResponse.json(updatedClientAssignment)
  } catch (error) {
    console.error("❌ Error updating client assignment:", error)
    return NextResponse.json(
      { error: "Error al actualizar la asignación de cliente" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: { assignmentId: string; clientId: string } }
) {
  try {
    const params = await context.params
    const { assignmentId, clientId } = params

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
      return NextResponse.json(
        { error: "Asignación de cliente no encontrada" },
        { status: 404 }
      )
    }

    // Verify it belongs to the correct assignment
    if (clientAssignment.assignmentId !== Number(assignmentId)) {
      return NextResponse.json(
        { error: "La asignación de cliente no pertenece a esta asignación" },
        { status: 400 }
      )
    }

    // Verify the assignment is not completed
    if (clientAssignment.assignment.isCompleted) {
      return NextResponse.json(
        { error: "No se puede eliminar de una asignación completada" },
        { status: 400 }
      )
    }

    // Verify the client assignment is not completed
    if (clientAssignment.status === "completed") {
      return NextResponse.json(
        { error: "No se puede eliminar una entrega completada" },
        { status: 400 }
      )
    }

    // Delete the client assignment
    await prisma.clientAssignment.delete({
      where: {
        id: Number(clientId),
      },
    })

    console.log(`✅ Client assignment ${clientId} deleted successfully`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("❌ Error deleting client assignment:", error)
    return NextResponse.json(
      { error: "Error al eliminar la asignación de cliente" },
      { status: 500 }
    )
  }
}