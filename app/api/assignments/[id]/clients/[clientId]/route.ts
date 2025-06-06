import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  try {
    const { id, clientId } = await params
    const assignmentId = Number.parseInt(id)
    const clientAssignmentId = Number.parseInt(clientId)

    if (isNaN(assignmentId) || isNaN(clientAssignmentId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 })
    }

    const clientAssignment = await prisma.clientAssignment.findFirst({
      where: {
        id: clientAssignmentId,
        assignmentId,
      },
      include: {
        customer: true,
      },
    })

    if (!clientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    return NextResponse.json(clientAssignment)
  } catch (error: any) {
    console.error("Error fetching client assignment:", error.message || error)
    return NextResponse.json(
      { error: "Error al obtener asignación de cliente", details: error.message },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { id: assignmentId, clientId } = await params
    const body = await request.json()
    const { status, deliveredQuantity } = body

    console.log("📊 PUT - URL params:", { assignmentId, clientId })
    console.log("📊 PUT - Request body:", { status, deliveredQuantity })

    // Validate IDs
    const assignmentIdNum = Number.parseInt(assignmentId)
    const clientIdNum = Number.parseInt(clientId)

    if (isNaN(assignmentIdNum) || isNaN(clientIdNum)) {
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

    // Get the client assignment
    const clientAssignment = await prisma.clientAssignment.findFirst({
      where: {
        id: clientIdNum,
        assignmentId: assignmentIdNum,
      },
      include: {
        assignment: {
          include: {
            truck: true,
          },
        },
      },
    })

    if (!clientAssignment) {
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    console.log("📊 Found client assignment:", {
      id: clientAssignment.id,
      assignmentId: clientAssignment.assignmentId,
      currentStatus: clientAssignment.status,
    })

    // Update the client assignment
    const updatedClientAssignment = await prisma.clientAssignment.update({
      where: { id: clientIdNum },
      data: {
        status,
        deliveredQuantity: deliveredQuantity
          ? Number.parseFloat(deliveredQuantity)
          : clientAssignment.allocatedQuantity,
        completedAt: status === "completed" ? new Date() : null,
      },
    })

    // Get ALL client assignments for this assignment to check completion status
    const allClientAssignments = await prisma.clientAssignment.findMany({
      where: { assignmentId: assignmentIdNum },
    })

    // Calculate total delivered and remaining for the assignment
    const totalAllocated = allClientAssignments.reduce((sum, ca) => sum + Number(ca.allocatedQuantity), 0)
    const totalDelivered = allClientAssignments.reduce((sum, ca) => {
      // Use the updated status for the current client assignment
      const deliveredQty =
        ca.id === clientIdNum
          ? Number(deliveredQuantity || clientAssignment.allocatedQuantity)
          : Number(ca.deliveredQuantity || 0)
      return sum + deliveredQty
    }, 0)
    const totalRemaining = Number(clientAssignment.assignment.totalLoaded) - totalDelivered

    console.log("📊 Delivery calculation:", {
      totalLoaded: Number(clientAssignment.assignment.totalLoaded),
      allocated: totalAllocated,
      delivered: totalDelivered,
      remaining: totalRemaining,
    })

    // Update assignment's total remaining
    await prisma.assignment.update({
      where: { id: assignmentIdNum },
      data: { totalRemaining },
    })

    console.log(`📊 Assignment ${assignmentId} total remaining updated to: ${totalRemaining}`)

    // ✅ ARREGLO MEJORADO: Verificar si TODAS las entregas están completadas
    const allCompleted = allClientAssignments.every((ca) => {
      // For the current client assignment being updated, use the new status
      if (ca.id === clientIdNum) {
        return status === "completed"
      }
      // For other client assignments, use their current status
      return ca.status === "completed"
    })

    const completedCount = allClientAssignments.filter((ca) => {
      if (ca.id === clientIdNum) {
        return status === "completed"
      }
      return ca.status === "completed"
    }).length

    console.log("📊 Checking completion status:", {
      totalClientAssignments: allClientAssignments.length,
      completedCount,
      allCompleted,
      currentClientStatus: status,
    })

    if (allCompleted) {
      console.log(`✅ All client assignments completed for assignment ${assignmentId}. Marking as completed.`)

      // Mark assignment as completed
      const completedAssignment = await prisma.assignment.update({
        where: { id: assignmentIdNum },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
        include: {
          truck: true,
        },
      })

      // 🚛 UPDATE TRUCK STATUS TO ACTIVE
      if (completedAssignment.truck) {
        await prisma.truck.update({
          where: { id: completedAssignment.truckId },
          data: {
            state: "Activo",
            lastRemaining: totalRemaining,
          },
        })

        console.log(
          `🚛 Truck ${completedAssignment.truck.placa} status updated from ${completedAssignment.truck.state} to Activo`,
        )
      }
    } else {
      console.log(
        `📊 Assignment ${assignmentId} still has ${allClientAssignments.length - completedCount} pending deliveries. Keeping as in-progress.`,
      )

      // Ensure assignment is not marked as completed if there are still pending deliveries
      await prisma.assignment.update({
        where: { id: assignmentIdNum },
        data: {
          isCompleted: false,
          completedAt: null,
        },
      })

      // Keep truck status as "Asignado" if assignment is still in progress
      if (clientAssignment.assignment.truck) {
        await prisma.truck.update({
          where: { id: clientAssignment.assignment.truckId },
          data: {
            state: "Asignado",
            lastRemaining: totalRemaining,
          },
        })

        console.log(
          `🚛 Truck ${clientAssignment.assignment.truck.placa} status kept as Asignado (${allClientAssignments.length - completedCount} deliveries pending)`,
        )
      }
    }

    console.log(`✅ Client assignment ${clientId} updated successfully`)

    return NextResponse.json({
      message: "Asignación de cliente actualizada exitosamente",
      clientAssignment: updatedClientAssignment,
      totalRemaining,
      assignmentCompleted: allCompleted,
      pendingDeliveries: allClientAssignments.length - completedCount,
    })
  } catch (error: any) {
    console.error("❌ Error updating client assignment:", error.message || error)
    return NextResponse.json({ error: "Error interno del servidor", details: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; clientId: string }> }) {
  try {
    console.log("🗑️ DELETE - Starting client assignment deletion")

    const token = (await cookies()).get("token")?.value
    if (!token) {
      console.log("❌ DELETE - No token provided")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      console.log("❌ DELETE - Invalid token or insufficient permissions")
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id: assignmentId, clientId } = await params
    console.log("🗑️ DELETE - URL params:", { assignmentId, clientId })

    // Validate IDs
    const assignmentIdNum = Number.parseInt(assignmentId)
    const clientIdNum = Number.parseInt(clientId)

    if (isNaN(assignmentIdNum) || isNaN(clientIdNum)) {
      console.log("❌ DELETE - Invalid IDs:", { assignmentId, clientId })
      return NextResponse.json({ error: "IDs inválidos" }, { status: 400 })
    }

    // Check if client assignment exists and belongs to the assignment
    const clientAssignment = await prisma.clientAssignment.findFirst({
      where: {
        id: clientIdNum,
        assignmentId: assignmentIdNum,
      },
    })

    if (!clientAssignment) {
      console.log("❌ DELETE - Client assignment not found")
      return NextResponse.json({ error: "Asignación de cliente no encontrada" }, { status: 404 })
    }

    console.log("🗑️ DELETE - Found client assignment:", {
      id: clientAssignment.id,
      status: clientAssignment.status,
      assignmentId: clientAssignment.assignmentId,
    })

    // Only allow deletion if status is pending
    if (clientAssignment.status !== "pending") {
      console.log("❌ DELETE - Cannot delete non-pending assignment")
      return NextResponse.json(
        { error: "No se puede eliminar una asignación que ya está en progreso o completada" },
        { status: 400 },
      )
    }

    // Delete the client assignment
    await prisma.clientAssignment.delete({
      where: { id: clientIdNum },
    })

    console.log("✅ DELETE - Client assignment deleted successfully")

    // Recalculate assignment totals
    const remainingClientAssignments = await prisma.clientAssignment.findMany({
      where: { assignmentId: assignmentIdNum },
    })

    const totalAllocated = remainingClientAssignments.reduce((sum, ca) => sum + Number(ca.allocatedQuantity), 0)
    const totalDelivered = remainingClientAssignments.reduce((sum, ca) => sum + Number(ca.deliveredQuantity || 0), 0)

    // Get original assignment to calculate remaining properly
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentIdNum },
      include: { truck: true },
    })

    if (!assignment) {
      return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 })
    }

    const totalRemaining = Number(assignment.totalLoaded) - totalDelivered

    console.log("🗑️ DELETE - Recalculated totals:", {
      totalLoaded: Number(assignment.totalLoaded),
      allocated: totalAllocated,
      delivered: totalDelivered,
      remaining: totalRemaining,
    })

    // Update assignment
    await prisma.assignment.update({
      where: { id: assignmentIdNum },
      data: {
        totalRemaining,
        isCompleted: false, // Reset completion status
        completedAt: null,
      },
    })

    // Update truck status back to Asignado if there are remaining client assignments
    if (assignment.truck && remainingClientAssignments.length > 0) {
      await prisma.truck.update({
        where: { id: assignment.truckId },
        data: {
          state: "Asignado",
          lastRemaining: totalRemaining,
        },
      })

      console.log(`🚛 DELETE - Truck ${assignment.truck.placa} status reverted to Asignado`)
    } else if (assignment.truck && remainingClientAssignments.length === 0) {
      // If no client assignments remain, set truck back to Activo
      await prisma.truck.update({
        where: { id: assignment.truckId },
        data: {
          state: "Activo",
          lastRemaining: assignment.totalLoaded,
        },
      })

      console.log(`🚛 DELETE - Truck ${assignment.truck.placa} status set to Activo (no clients remaining)`)
    }

    console.log("✅ DELETE - Operation completed successfully")

    return NextResponse.json({
      message: "Asignación de cliente eliminada exitosamente",
      totalRemaining,
    })
  } catch (error: any) {
    console.error("❌ DELETE - Error deleting client assignment:", error)
    console.error("❌ DELETE - Error stack:", error.stack)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    )
  }
}
