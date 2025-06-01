import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AssignmentSchema } from "@/lib/zod-schemas"
import { verifyToken } from "@/lib/jwt"
import { getTodayRange } from "@/lib/date"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date")

    const whereClause: any = {}

    if (driverId) {
      whereClause.driverId = Number.parseInt(driverId)
    }

    if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        truck: true,
        driver: true,
        discharges: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error("Error fetching assignments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== "Admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = AssignmentSchema.parse(body)

    // Get truck's remaining fuel from previous day
    const truck = await prisma.truck.findUnique({
      where: { id: validatedData.truckId },
    })

    if (!truck) {
      return NextResponse.json({ error: "Truck not found" }, { status: 404 })
    }

    // Check if driver already has an assignment for today
    const { start, end } = getTodayRange()
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        driverId: validatedData.driverId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json({ error: "Driver already has an assignment for today" }, { status: 400 })
    }

    // Calculate total available fuel (loaded + remaining from previous day)
    const totalAvailable = validatedData.totalLoaded + Number(truck.lastRemaining)

    const assignment = await prisma.assignment.create({
      data: {
        ...validatedData,
        totalLoaded: validatedData.totalLoaded,
        totalRemaining: totalAvailable,
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

    // Update truck state to assigned
    await prisma.truck.update({
      where: { id: validatedData.truckId },
      data: { state: "Asignado" },
    })

    return NextResponse.json(assignment)
  } catch (error) {
    console.error("Error creating assignment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
