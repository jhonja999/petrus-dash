// app/api/reports/route.ts
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
    const fuelType = searchParams.get("fuelType")

    console.log("Report params:", { date, startDate, endDate, truckId, driverId, fuelType })

    // Build where clause for filtering
    const where: any = {}

    // Date filtering
    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      where.createdAt = {
        gte: targetDate,
        lt: nextDay,
      }
    } else if (startDate) {
      const start = new Date(startDate)
      const end = endDate ? new Date(endDate) : new Date(startDate)
      if (endDate) {
        end.setDate(end.getDate() + 1) // Include end date
      }
      
      where.createdAt = {
        gte: start,
        lt: end,
      }
    }

    // Other filters
    if (truckId && truckId !== "all") {
      where.truckId = parseInt(truckId)
    }

    if (driverId && driverId !== "all") {
      where.driverId = parseInt(driverId)
    }

    if (fuelType && fuelType !== "all") {
      where.fuelType = fuelType
    }

    console.log("Where clause:", where)

    // Fetch assignments with related data
    const assignments = await prisma.assignment.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log(`Found ${assignments.length} assignments`)

    // Calculate summary statistics
    const totalFuelLoaded = assignments.reduce(
      (sum, assignment) => sum + parseFloat(assignment.totalLoaded.toString()),
      0
    )

    const totalFuelRemaining = assignments.reduce(
      (sum, assignment) => sum + parseFloat(assignment.totalRemaining.toString()),
      0
    )

    const totalFuelDischarged = totalFuelLoaded - totalFuelRemaining

    const completedAssignments = assignments.filter(
      (assignment) => assignment.isCompleted
    ).length

    const pendingAssignments = assignments.length - completedAssignments

    // Calculate unique trucks and drivers used
    const trucksUsed = new Set(assignments.map((a) => a.truckId)).size
    const driversActive = new Set(assignments.map((a) => a.driverId)).size

    // Calculate efficiency percentage
    const efficiencyPercentage = totalFuelLoaded > 0 
      ? (totalFuelDischarged / totalFuelLoaded) * 100 
      : 0

    // Additional statistics
    const averageFuelPerAssignment = assignments.length > 0 
      ? totalFuelLoaded / assignments.length 
      : 0

    const dischargeStatistics = {
      totalDischarges: assignments.reduce((sum, a) => sum + a.discharges.length, 0),
      completedDischarges: assignments.reduce(
        (sum, a) => sum + a.discharges.filter(d => d.status === "finalizado").length, 
        0
      ),
      pendingDischarges: assignments.reduce(
        (sum, a) => sum + a.discharges.filter(d => d.status === "pendiente").length, 
        0
      ),
    }

    // Fuel type breakdown
    const fuelTypeBreakdown = assignments.reduce((acc, assignment) => {
      const fuel = assignment.fuelType
      if (!acc[fuel]) {
        acc[fuel] = {
          count: 0,
          totalLoaded: 0,
          totalRemaining: 0,
        }
      }
      acc[fuel].count++
      acc[fuel].totalLoaded += parseFloat(assignment.totalLoaded.toString())
      acc[fuel].totalRemaining += parseFloat(assignment.totalRemaining.toString())
      return acc
    }, {} as Record<string, { count: number; totalLoaded: number; totalRemaining: number }>)

    const reportData = {
      assignments,
      summary: {
        totalFuelLoaded,
        totalFuelDischarged,
        totalFuelRemaining,
        completedAssignments,
        pendingAssignments,
        trucksUsed,
        driversActive,
        efficiencyPercentage,
        averageFuelPerAssignment,
        ...dischargeStatistics,
      },
      breakdown: {
        fuelTypes: fuelTypeBreakdown,
      },
      metadata: {
        totalRecords: assignments.length,
        dateRange: {
          start: startDate || date,
          end: endDate || date,
        },
        filters: {
          truckId: truckId !== "all" ? truckId : null,
          driverId: driverId !== "all" ? driverId : null,
          fuelType: fuelType !== "all" ? fuelType : null,
        },
        generatedAt: new Date().toISOString(),
      },
    }

    console.log("Report generated successfully")
    return NextResponse.json(reportData)

  } catch (error) {
    console.error("Error generating report:", error)
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}