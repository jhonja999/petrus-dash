// app/api/reports/deliveries/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Check if user has admin permissions
    if (payload.role === "Operador") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const date = searchParams.get("date")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const truckId = searchParams.get("truckId")
    const driverId = searchParams.get("driverId")
    const customerId = searchParams.get("customerId")
    const fuelType = searchParams.get("fuelType")

    console.log("Delivery report params:", { date, startDate, endDate, truckId, driverId, customerId, fuelType })

    // Build where clause for filtering client assignments
    const where: any = {}

    // Date filtering on assignment creation
    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)

      where.assignment = {
        createdAt: {
          gte: targetDate,
          lt: nextDay,
        },
      }
    } else if (startDate) {
      const start = new Date(startDate)
      const end = endDate ? new Date(endDate) : new Date(startDate)
      if (endDate) {
        end.setDate(end.getDate() + 1) // Include end date
      }

      where.assignment = {
        createdAt: {
          gte: start,
          lt: end,
        },
      }
    }

    // Other filters
    if (truckId && truckId !== "all") {
      where.assignment = {
        ...where.assignment,
        truckId: Number.parseInt(truckId),
      }
    }

    if (driverId && driverId !== "all") {
      where.assignment = {
        ...where.assignment,
        driverId: Number.parseInt(driverId),
      }
    }

    if (customerId && customerId !== "all") {
      where.customerId = Number.parseInt(customerId)
    }

    if (fuelType && fuelType !== "all") {
      where.assignment = {
        ...where.assignment,
        fuelType: fuelType,
      }
    }

    console.log("Where clause for deliveries:", JSON.stringify(where, null, 2))

    // Fetch client assignments (deliveries) with related data
    const deliveries = await prisma.clientAssignment.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            companyname: true,
            ruc: true,
          },
        },
        assignment: {
          include: {
            truck: {
              select: {
                id: true,
                placa: true,
                typefuel: true,
                capacitygal: true,
              },
            },
            driver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(`Found ${deliveries.length} deliveries`)

    // Calculate summary statistics
    const totalFuelAllocated = deliveries.reduce(
      (sum, delivery) => sum + Number.parseFloat(delivery.allocatedQuantity.toString()),
      0,
    )

    const totalFuelDelivered = deliveries.reduce(
      (sum, delivery) => sum + Number.parseFloat(delivery.deliveredQuantity?.toString() || "0"),
      0,
    )

    const completedDeliveries = deliveries.filter((delivery) => delivery.status === "completed").length

    const pendingDeliveries = deliveries.length - completedDeliveries

    // Calculate unique trucks, drivers, and customers used
    const trucksUsed = new Set(deliveries.map((d) => d.assignment.truckId)).size
    const driversActive = new Set(deliveries.map((d) => d.assignment.driverId)).size
    const customersServed = new Set(deliveries.map((d) => d.customerId)).size

    // Calculate efficiency percentage
    const efficiencyPercentage = totalFuelAllocated > 0 ? (totalFuelDelivered / totalFuelAllocated) * 100 : 0

    // Additional statistics
    const averageFuelPerDelivery = deliveries.length > 0 ? totalFuelAllocated / deliveries.length : 0

    // Fuel type breakdown
    const fuelTypeBreakdown = deliveries.reduce(
      (acc, delivery) => {
        const fuel = delivery.assignment.fuelType
        if (!acc[fuel]) {
          acc[fuel] = {
            count: 0,
            totalAllocated: 0,
            totalDelivered: 0,
          }
        }
        acc[fuel].count++
        acc[fuel].totalAllocated += Number.parseFloat(delivery.allocatedQuantity.toString())
        acc[fuel].totalDelivered += Number.parseFloat(delivery.deliveredQuantity?.toString() || "0")
        return acc
      },
      {} as Record<string, { count: number; totalAllocated: number; totalDelivered: number }>,
    )

    // Customer breakdown
    const customerBreakdown = deliveries.reduce(
      (acc, delivery) => {
        const customerName = delivery.customer.companyname
        if (!acc[customerName]) {
          acc[customerName] = {
            count: 0,
            totalAllocated: 0,
            totalDelivered: 0,
          }
        }
        acc[customerName].count++
        acc[customerName].totalAllocated += Number.parseFloat(delivery.allocatedQuantity.toString())
        acc[customerName].totalDelivered += Number.parseFloat(delivery.deliveredQuantity?.toString() || "0")
        return acc
      },
      {} as Record<string, { count: number; totalAllocated: number; totalDelivered: number }>,
    )

    const reportData = {
      deliveries,
      summary: {
        totalFuelAllocated,
        totalFuelDelivered,
        totalDeliveries: deliveries.length,
        completedDeliveries,
        pendingDeliveries,
        trucksUsed,
        driversActive,
        customersServed,
        efficiencyPercentage,
        averageFuelPerDelivery,
      },
      breakdown: {
        fuelTypes: fuelTypeBreakdown,
        customers: customerBreakdown,
      },
      metadata: {
        totalRecords: deliveries.length,
        dateRange: {
          start: startDate || date,
          end: endDate || date,
        },
        filters: {
          truckId: truckId !== "all" ? truckId : null,
          driverId: driverId !== "all" ? driverId : null,
          customerId: customerId !== "all" ? customerId : null,
          fuelType: fuelType !== "all" ? fuelType : null,
        },
        generatedAt: new Date().toISOString(),
      },
    }

    console.log("Delivery report generated successfully")
    return NextResponse.json(reportData)
  } catch (error) {
    console.error("Error generating delivery report:", error)

    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
