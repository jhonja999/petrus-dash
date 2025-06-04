import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken, isAdmin } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const dateFilter = searchParams.get("date")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    console.log(
      `🔍 Assignments API: Query params - driverId: ${driverId}, date: ${dateFilter}, page: ${page}, limit: ${limit}`,
    )

    // Build where clause
    const where: any = {}

    // Filter by driver ID if provided
    if (driverId) {
      const driverIdNum = Number.parseInt(driverId)
      if (isNaN(driverIdNum)) {
        return NextResponse.json({ error: "Invalid driver ID format" }, { status: 400 })
      }
      where.driverId = driverIdNum
      console.log(`🎯 Assignments API: Filtering by driverId: ${driverIdNum}`)
    }

    // Filter by date if provided
    if (dateFilter) {
      const startDate = new Date(dateFilter)
      const endDate = new Date(dateFilter)
      endDate.setDate(endDate.getDate() + 1)

      where.createdAt = {
        gte: startDate,
        lt: endDate,
      }
      console.log(`📅 Assignments API: Filtering by date range: ${startDate.toISOString()} to ${endDate.toISOString()}`)
    }

    // Check permissions for driver-specific requests
    if (driverId && !isAdmin(user)) {
      if (user.id !== Number.parseInt(driverId)) {
        return NextResponse.json({ error: "Access denied. You can only view your own assignments." }, { status: 403 })
      }
    }

    console.log(`🔍 Assignments API: Final where clause:`, where)

    // If filtering by specific driver, return simple array
    if (driverId) {
      const assignments = await prisma.assignment.findMany({
        where,
        include: {
          truck: {
            select: {
              id: true,
              placa: true,
              // Removed 'model' field as it doesn't exist in the schema
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              dni: true,
            },
          },
          discharges: {
            include: {
              customer: {
                select: {
                  id: true,
                  companyname: true,
                  ruc: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })

      console.log(`✅ Assignments API: Found ${assignments.length} assignments for driver ${driverId}`)
      return NextResponse.json(assignments)
    }

    // For admin requests without specific driver, return paginated results
    const skip = (page - 1) * limit

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          truck: {
            select: {
              id: true,
              placa: true,
              // Removed 'model' field as it doesn't exist in the schema
            },
          },
          driver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              dni: true,
            },
          },
          discharges: {
            include: {
              customer: {
                select: {
                  id: true,
                  companyname: true,
                  ruc: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ])

    console.log(`✅ Assignments API: Found ${assignments.length} assignments (total: ${total})`)

    return NextResponse.json({
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("❌ Assignments API: Error fetching assignments:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: "Access denied. Admin privileges required." }, { status: 403 })
    }

    const body = await request.json()
    const { driverId, truckId, totalLoaded, fuelType, notes } = body

    // Validation
    if (!driverId || !truckId || !totalLoaded || !fuelType) {
      return NextResponse.json(
        {
          error: "Missing required fields (driverId, truckId, totalLoaded, fuelType)",
        },
        { status: 400 },
      )
    }

    if (isNaN(totalLoaded) || totalLoaded <= 0) {
      return NextResponse.json({ error: "Total loaded must be a positive number" }, { status: 400 })
    }

    // Verify driver exists and is active
    const driver = await prisma.user.findUnique({
      where: { id: Number.parseInt(driverId) },
    })

    if (!driver || driver.role !== "Operador" || driver.state !== "Activo") {
      return NextResponse.json({ error: "Driver not found or not active" }, { status: 404 })
    }

    // Verify truck exists and is available
    const truck = await prisma.truck.findUnique({
      where: { id: Number.parseInt(truckId) },
    })

    if (!truck || truck.state !== "Activo") {
      return NextResponse.json({ error: "Truck not found or not available" }, { status: 404 })
    }

    // Create assignment
    const newAssignment = await prisma.assignment.create({
      data: {
        driverId: Number.parseInt(driverId),
        truckId: Number.parseInt(truckId),
        totalLoaded: Number.parseFloat(totalLoaded),
        totalRemaining: Number.parseFloat(totalLoaded),
        fuelType,
        notes: notes || null,
      },
      include: {
        truck: {
          select: {
            id: true,
            placa: true,
            // Removed 'model' field as it doesn't exist in the schema
          },
        },
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            dni: true,
          },
        },
        discharges: true,
      },
    })

    // Update truck status to "Asignado"
    await prisma.truck.update({
      where: { id: Number.parseInt(truckId) },
      data: { state: "Asignado" },
    })

    console.log(`✅ Assignments API: Created assignment ${newAssignment.id} for driver ${driverId}`)

    return NextResponse.json(newAssignment, { status: 201 })
  } catch (error) {
    console.error("❌ Assignments API: Error creating assignment:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}