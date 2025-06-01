import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest, { params }: { params: { driverId: string } }) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const driverId = Number.parseInt(params.driverId)

    // Check if user can access this driver's data
    if (payload.role !== "Admin" && payload.id !== driverId.toString()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find today's assignments for this driver
    const assignments = await prisma.assignment.findMany({
      where: {
        driverId: driverId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        truck: true,
        discharges: {
          include: {
            customer: true,
          },
        },
      },
    })

    // Extract all discharges from assignments
    const discharges = assignments.flatMap((assignment) =>
      assignment.discharges.map((discharge) => ({
        ...discharge,
        assignment: {
          ...assignment,
          discharges: undefined, // Avoid circular reference
        },
      })),
    )

    return NextResponse.json(discharges)
  } catch (error) {
    console.error("Error fetching driver discharges:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
