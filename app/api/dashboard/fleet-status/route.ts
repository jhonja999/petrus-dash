import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Get all trucks with their latest assignments
    const trucks = await prisma.truck.findMany({
      include: {
        assignments: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            driver: {
              select: {
                name: true,
                lastname: true,
              },
            },
          },
        },
        dispatches: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { placa: "asc" },
    })

    // Transform truck data to include fleet status information
    const fleetStatus = trucks.map((truck) => {
      const currentLoad = Number(truck.currentLoad || 0)
      const capacity = Number(truck.capacitygal)
      const remaining = Number(truck.lastRemaining || 0)

      // Calculate alerts
      const fuelLow = remaining < capacity * 0.1 // Less than 10% fuel
      const maintenanceDue = false // TODO: Implement maintenance scheduling

      // Get assigned driver
      const latestAssignment = truck.assignments[0]
      const assignedDriver = latestAssignment?.driver
        ? `${latestAssignment.driver.name} ${latestAssignment.driver.lastname}`
        : undefined

      // Get last activity
      const lastDispatch = truck.dispatches[0]
      const lastActivity = lastDispatch
        ? `${lastDispatch.status} - ${new Date(lastDispatch.createdAt).toLocaleDateString("es-PE")}`
        : undefined

      return {
        id: truck.id,
        placa: truck.placa,
        state: truck.state,
        typefuel: truck.typefuel,
        capacitygal: capacity,
        currentLoad,
        lastRemaining: remaining,
        lastActivity,
        maintenanceDue,
        fuelLow,
        assignedDriver,
      }
    })

    return NextResponse.json({
      success: true,
      data: fleetStatus,
    })
  } catch (error) {
    console.error("Error fetching fleet status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
