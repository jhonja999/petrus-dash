import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { isAdmin, isConductor } from "@/lib/auth"

// GET: Fetch all assignments or filter by query params
export async function GET(req: Request) {
  try {
    const { userId, sessionClaims } =await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Check if user has valid role
    if (!isAdmin(userRole) && !isConductor(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const truckId = searchParams.get("truckId")
    const driverId = searchParams.get("driverId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build filter object based on query params
    const filter: any = {}
    if (truckId) filter.truckId = Number(truckId)
    if (driverId) filter.driverId = Number(driverId)

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {}
      if (startDate) filter.createdAt.gte = new Date(startDate)
      if (endDate) filter.createdAt.lte = new Date(endDate)
    }

    const assignments = await db.assignment.findMany({
      where: filter,
      orderBy: { id: "desc" },
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

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("[ASSIGNMENTS_GET]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// POST: Create a new assignment
export async function POST(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can create assignments
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { truckId, driverId, totalLoaded, fuelType, notes } = body

    if (!truckId || !driverId || !totalLoaded || !fuelType) {
      return new NextResponse("Faltan campos requeridos", { status: 400 })
    }

    // Check if truck exists and is available
    const truck = await db.truck.findUnique({
      where: { id: Number(truckId) },
    })

    if (!truck) {
      return new NextResponse("Camión no encontrado", { status: 404 })
    }

    if (truck.state !== "Activo") {
      return new NextResponse(`Camión no disponible, estado actual: ${truck.state}`, { status: 409 })
    }

    // Check if driver exists and is available
    const driver = await db.user.findUnique({
      where: {
        id: Number(driverId),
        role: "Conductor",
        state: "Activo",
      },
    })

    if (!driver) {
      return new NextResponse("Conductor no encontrado o no disponible", { status: 404 })
    }

    // Validate totalLoaded against truck capacity
    if (totalLoaded > Number(truck.capacitygal)) {
      return new NextResponse(`La carga excede la capacidad del camión (${truck.capacitygal} galones)`, { status: 400 })
    }

    // Start a transaction to update both assignment and truck
    const assignment = await db.$transaction(async (prisma) => {
      // Create assignment
      const newAssignment = await prisma.assignment.create({
        data: {
          truckId: Number(truckId),
          driverId: Number(driverId),
          totalLoaded,
          totalRemaining: totalLoaded,
          fuelType,
          notes,
        },
        include: {
          truck: true,
          driver: true,
        },
      })

      // Update truck status
      await prisma.truck.update({
        where: { id: Number(truckId) },
        data: { state: "Asignado" },
      })

      // Update driver status
      await prisma.user.update({
        where: { id: Number(driverId) },
        data: { state: "Asignado" },
      })

      return newAssignment
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("[ASSIGNMENTS_POST]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// PATCH: Update an assignment
export async function PATCH(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can update assignments
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const body = await req.json()
    const { id, totalLoaded, fuelType, notes } = body

    if (!id) {
      return new NextResponse("ID de la asignación es requerido", { status: 400 })
    }

    // Check if assignment exists
    const existingAssignment = await db.assignment.findUnique({
      where: { id: Number(id) },
      include: {
        discharges: true,
        truck: true,
      },
    })

    if (!existingAssignment) {
      return new NextResponse("Asignación no encontrada", { status: 404 })
    }

    // If there are discharges, we need to be careful with updating totalLoaded
    if (existingAssignment.discharges.length > 0) {
      const totalDischarged = existingAssignment.discharges.reduce(
        (sum, discharge) => sum + Number(discharge.totalDischarged),
        0,
      )

      // If new totalLoaded is less than what's already been discharged
      if (totalLoaded !== undefined && totalLoaded < totalDischarged) {
        return new NextResponse(
          `No se puede reducir la carga total a menos de lo ya descargado (${totalDischarged} galones)`,
          { status: 400 },
        )
      }

      // Calculate new totalRemaining based on new totalLoaded
      const newTotalRemaining =
        totalLoaded !== undefined ? totalLoaded - totalDischarged : existingAssignment.totalRemaining

      // Validate against truck capacity
      if (totalLoaded !== undefined && totalLoaded > Number(existingAssignment.truck.capacitygal)) {
        return new NextResponse(
          `La carga excede la capacidad del camión (${existingAssignment.truck.capacitygal} galones)`,
          { status: 400 },
        )
      }

      const updatedAssignment = await db.assignment.update({
        where: { id: Number(id) },
        data: {
          totalLoaded: totalLoaded !== undefined ? totalLoaded : undefined,
          totalRemaining: newTotalRemaining,
          fuelType: fuelType || undefined,
          notes: notes !== undefined ? notes : undefined,
        },
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

      return NextResponse.json(updatedAssignment)
    } else {
      // No discharges yet, simpler update
      if (totalLoaded !== undefined && totalLoaded > Number(existingAssignment.truck.capacitygal)) {
        return new NextResponse(
          `La carga excede la capacidad del camión (${existingAssignment.truck.capacitygal} galones)`,
          { status: 400 },
        )
      }

      const updatedAssignment = await db.assignment.update({
        where: { id: Number(id) },
        data: {
          totalLoaded: totalLoaded !== undefined ? totalLoaded : undefined,
          totalRemaining: totalLoaded !== undefined ? totalLoaded : undefined,
          fuelType: fuelType || undefined,
          notes: notes !== undefined ? notes : undefined,
        },
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

      return NextResponse.json(updatedAssignment)
    }
  } catch (error) {
    console.error("[ASSIGNMENTS_PATCH]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}

// DELETE: Delete an assignment
export async function DELETE(req: Request) {
  try {
    const { userId, sessionClaims } = await auth()
    const userRole = sessionClaims?.metadata?.role as string | undefined

    if (!userId) {
      return new NextResponse("No autorizado", { status: 401 })
    }

    // Only admins can delete assignments
    if (!isAdmin(userRole)) {
      return new NextResponse("Permisos insuficientes", { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return new NextResponse("ID de la asignación es requerido", { status: 400 })
    }

    // Check if assignment has discharges
    const assignment = await db.assignment.findUnique({
      where: { id: Number(id) },
      include: {
        discharges: true,
        truck: true,
        driver: true,
      },
    })

    if (!assignment) {
      return new NextResponse("Asignación no encontrada", { status: 404 })
    }

    if (assignment.discharges.length > 0) {
      return new NextResponse("No se puede eliminar la asignación porque tiene descargas asociadas", { status: 409 })
    }

    // Start a transaction to update both assignment and truck
    await db.$transaction(async (prisma) => {
      // Delete assignment
      await prisma.assignment.delete({
        where: { id: Number(id) },
      })

      // Update truck status back to Activo
      await prisma.truck.update({
        where: { id: assignment.truckId },
        data: { state: "Activo" },
      })

      // Update driver status back to Activo
      await prisma.user.update({
        where: { id: assignment.driverId },
        data: { state: "Activo" },
      })
    })

    return new NextResponse("Asignación eliminada correctamente")
  } catch (error) {
    console.error("[ASSIGNMENTS_DELETE]", error)
    return new NextResponse("Error interno del servidor", { status: 500 })
  }
}
