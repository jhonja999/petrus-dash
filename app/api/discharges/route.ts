import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { isAdmin, isConductor } from "@/lib/auth"

// GET: Fetch all discharges or filter by query params
export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Check if user has valid role
    if (!isAdmin(userRole) && !isConductor(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const assignmentId = searchParams.get("assignmentId")
    const customerId = searchParams.get("customerId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build filter object based on query params
    const filter: any = {}
    if (assignmentId) filter.assignmentId = Number(assignmentId)
    if (customerId) filter.customerId = Number(customerId)

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.gte = new Date(startDate)
      if (endDate) filter.createdAt.lte = new Date(endDate)
    }

    const discharges = await db.discharge.findMany({
      where: filter,
      orderBy: { id: "desc" },
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

    return NextResponse.json(discharges)
  } catch (error) {
    console.error("[DISCHARGES_GET]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// POST: Create a new discharge
export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can create discharges
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { assignmentId, customerId, totalDischarged, notes } = body

    if (!assignmentId || !customerId || !totalDischarged) {
      return new NextResponse("Faltan campos requeridos", { status: 400 })
    }

    // Check if assignment exists
    const assignment = await db.assignment.findUnique({
      where: { id: Number(assignmentId) },
      include: {
        truck: true,
      },
    })

    if (!assignment) {
      return new NextResponse("Asignación no encontrada", { status: 404 })
    }

    // Check if customer exists
    const customer = await db.customer.findUnique({
      where: { id: Number(customerId) },
    })

    if (!customer) {
      return new NextResponse("Cliente no encontrado", { status: 404 })
    }

    // Check if there's enough fuel remaining
    if (totalDischarged > Number(assignment.totalRemaining)) {
      return new NextResponse(
        `La cantidad a descargar excede el combustible restante (${assignment.totalRemaining} galones)`,
        { status: 400 },
      )
    }

    // Start a transaction to update both discharge and assignment
    const result = await db.$transaction(async (prisma) => {
      // Create discharge
      const newDischarge = await prisma.discharge.create({
        data: {
          assignmentId: Number(assignmentId),
          customerId: Number(customerId),
          totalDischarged,
          notes,
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

      // Calculate new remaining fuel
      const newRemaining = Number(assignment.totalRemaining) - totalDischarged

      // Update assignment
      const updatedAssignment = await prisma.assignment.update({
        where: { id: Number(assignmentId) },
        data: { totalRemaining: newRemaining },
      })

      // If no fuel remaining, update truck status to Activo
      if (newRemaining === 0) {
        await prisma.truck.update({
          where: { id: assignment.truckId },
          data: { state: "Activo" },
        })

        // Update driver status to Activo
        await prisma.user.update({
          where: { id: assignment.driverId },
          data: { state: "Activo" },
        })
      } else {
        // Update truck status to Descarga
        await prisma.truck.update({
          where: { id: assignment.truckId },
          data: { state: "Descarga" },
        })
      }

      return { discharge: newDischarge, assignment: updatedAssignment }
    })

    return NextResponse.json(result.discharge)
  } catch (error) {
    console.error("[DISCHARGES_POST]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// PATCH: Update a discharge
export async function PATCH(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can update discharges
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { id, totalDischarged, notes } = body

    if (!id) {
      return new NextResponse("ID de la descarga es requerido", { status: 400 })
    }

    // Check if discharge exists
    const existingDischarge = await db.discharge.findUnique({
      where: { id: Number(id) },
      include: {
        assignment: true,
      },
    })

    if (!existingDischarge) {
      return new NextResponse("Descarga no encontrada", { status: 404 })
    }

    // If totalDischarged is being updated
    if (totalDischarged !== undefined) {
      // Calculate the difference
      const dischargeDifference = totalDischarged - Number(existingDischarge.totalDischarged)

      // Get current assignment data
      const assignment = await db.assignment.findUnique({
        where: { id: existingDischarge.assignmentId },
      })

      if (!assignment) {
        return new NextResponse("Asignación no encontrada", { status: 404 })
      }

      // Check if there's enough fuel remaining for the increase
      if (dischargeDifference > 0 && dischargeDifference > Number(assignment.totalRemaining)) {
        return new NextResponse(
          `No hay suficiente combustible restante para aumentar la descarga (${assignment.totalRemaining} galones disponibles)`,
          { status: 400 },
        )
      }

      // Start a transaction to update both discharge and assignment
      const result = await db.$transaction(async (prisma) => {
        // Update discharge
        const updatedDischarge = await prisma.discharge.update({
          where: { id: Number(id) },
          data: {
            totalDischarged,
            notes: notes !== undefined ? notes : undefined,
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

        // Calculate new remaining fuel
        const newRemaining = Number(assignment.totalRemaining) - dischargeDifference

        // Update assignment
        const updatedAssignment = await prisma.assignment.update({
          where: { id: existingDischarge.assignmentId },
          data: { totalRemaining: newRemaining },
        })

        // Update truck status based on remaining fuel
        if (newRemaining === 0) {
          await prisma.truck.update({
            where: { id: assignment.truckId },
            data: { state: "Activo" },
          })

          // Update driver status
          await prisma.user.update({
            where: { id: assignment.driverId },
            data: { state: "Activo" },
          })
        } else if (dischargeDifference !== 0) {
          // Only update if there was a change in discharge amount
          await prisma.truck.update({
            where: { id: assignment.truckId },
            data: { state: "Descarga" },
          })
        }

        return { discharge: updatedDischarge, assignment: updatedAssignment }
      })

      return NextResponse.json(result.discharge)
    } else {
      // No change to totalDischarged, simple update
      const updatedDischarge = await db.discharge.update({
        where: { id: Number(id) },
        data: {
          notes: notes !== undefined ? notes : undefined,
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

      return NextResponse.json(updatedDischarge)
    }
  } catch (error) {
    console.error("[DISCHARGES_PATCH]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// DELETE: Delete a discharge
export async function DELETE(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can delete discharges
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return new NextResponse("ID de la descarga es requerido", { status: 400 })
    }

    // Check if discharge exists
    const discharge = await db.discharge.findUnique({
      where: { id: Number(id) },
      include: {
        assignment: true,
      },
    })

    if (!discharge) {
      return new NextResponse("Descarga no encontrada", { status: 404 })
    }

    // Start a transaction to update both discharge and assignment
    await db.$transaction(async (prisma) => {
      // Delete discharge
      await prisma.discharge.delete({
        where: { id: Number(id) },
      })

      // Update assignment's totalRemaining
      const assignment = await prisma.assignment.findUnique({
        where: { id: discharge.assignmentId },
      })

      if (assignment) {
        const newRemaining = Number(assignment.totalRemaining) + Number(discharge.totalDischarged)

        await prisma.assignment.update({
          where: { id: discharge.assignmentId },
          data: { totalRemaining: newRemaining },
        })

        // Update truck status to Asignado since we're reverting a discharge
        await prisma.truck.update({
          where: { id: assignment.truckId },
          data: { state: "Asignado" },
        })
      }
    })

    return new NextResponse("Descarga eliminada correctamente")
  } catch (error) {
    console.error("[DISCHARGES_DELETE]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}
