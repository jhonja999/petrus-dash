import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Assuming prisma is correctly imported from lib/prisma
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { Role } from "@prisma/client" // Import Role enum

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get today's dispatches
    const todayDispatches = await prisma.dispatch.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        truck: {
          select: {
            placa: true,
            state: true,
          },
        },
        driver: {
          select: {
            name: true,
            lastname: true,
          },
        },
        customer: {
          select: {
            companyname: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Get truck fleet status
    const trucks = await prisma.truck.findMany({
      select: {
        id: true,
        placa: true,
        state: true,
        lastRemaining: true,
        typefuel: true,
        lastMaintenanceDate: true,
      },
      orderBy: {
        placa: "asc",
      },
    })

    // Get active drivers
    const activeDrivers = await prisma.user.findMany({
      where: {
        role: Role.OPERADOR, // Corrected enum usage
        state: "Activo",
      },
      select: {
        id: true,
        name: true,
        lastname: true,
      },
    })

    // Calculate metrics
    const totalDispatches = todayDispatches.length
    const completedDispatches = todayDispatches.filter((d) => d.status === "COMPLETADO").length
    const inProgressDispatches = todayDispatches.filter((d) => d.status === "EN_RUTA").length
    const pendingDispatches = todayDispatches.filter((d) => d.status === "PROGRAMADO").length

    const totalGallons = todayDispatches.reduce((sum, dispatch) => sum + Number(dispatch.quantity), 0)
    const completedGallons = todayDispatches
      .filter((d) => d.status === "COMPLETADO")
      .reduce((sum, dispatch) => sum + Number(dispatch.quantity), 0)

    // Estimate revenue (assuming average price per gallon)
    const avgPricePerGallon = 12.5 // S/ per gallon
    const estimatedRevenue = completedGallons * avgPricePerGallon

    // Truck status summary
    const truckStatusSummary = trucks.reduce(
      (acc, truck) => {
        acc[truck.state] = (acc[truck.state] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Efficiency calculation
    const efficiency = totalDispatches > 0 ? Math.round((completedDispatches / totalDispatches) * 100) : 0

    // Recent activity (last 10 dispatches)
    const recentActivity = todayDispatches.slice(0, 10).map((dispatch) => ({
      id: dispatch.id,
      type: "dispatch",
      action: `Despacho ${dispatch.dispatchNumber}`,
      description: `${dispatch.customer.companyname} - ${dispatch.quantity} gal`,
      status: dispatch.status,
      timestamp: dispatch.createdAt,
      user: `${dispatch.driver.name} ${dispatch.driver.lastname}`,
      truck: dispatch.truck.placa,
    }))

    // Fuel distribution by type
    const fuelDistribution = todayDispatches.reduce(
      (acc, dispatch) => {
        const fuelType =
          dispatch.fuelType === "PERSONALIZADO" ? dispatch.customFuelName || "Personalizado" : dispatch.fuelType
        acc[fuelType] = (acc[fuelType] || 0) + Number(dispatch.quantity)
        return acc
      },
      {} as Record<string, number>,
    )

    // Priority distribution
    const priorityDistribution = todayDispatches.reduce(
      (acc, dispatch) => {
        acc[dispatch.priority] = (acc[dispatch.priority] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalDispatches,
          completedDispatches,
          inProgressDispatches,
          pendingDispatches,
          totalGallons,
          completedGallons,
          estimatedRevenue,
          efficiency,
          activeDrivers: activeDrivers.length,
          operationalTrucks: trucks.filter((t) => t.state === "Activo").length,
          totalTrucks: trucks.length,
        },
        dispatches: todayDispatches.map((dispatch) => ({
          id: dispatch.id,
          dispatchNumber: dispatch.dispatchNumber,
          customer: dispatch.customer.companyname,
          driver: `${dispatch.driver.name} ${dispatch.driver.lastname}`,
          truck: dispatch.truck.placa,
          quantity: Number(dispatch.quantity),
          fuelType: dispatch.fuelType === "PERSONALIZADO" ? dispatch.customFuelName : dispatch.fuelType,
          status: dispatch.status,
          priority: dispatch.priority,
          scheduledDate: dispatch.scheduledDate,
          startedAt: dispatch.startedAt,
          completedAt: dispatch.completedAt,
          progress: getDispatchProgress(dispatch.status),
          deliveryAddress: dispatch.deliveryAddress,
        })),
        fleet: trucks.map((truck) => ({
          id: truck.id,
          placa: truck.placa,
          status: truck.state,
          currentFuel: Number(truck.lastRemaining) || 0,
          fuelType: truck.typefuel,
          lastMaintenance: truck.lastMaintenanceDate,
          needsMaintenance: truck.lastMaintenanceDate
            ? new Date().getTime() - new Date(truck.lastMaintenanceDate).getTime() > 30 * 24 * 60 * 60 * 1000
            : true,
        })),
        recentActivity,
        statistics: {
          truckStatus: truckStatusSummary,
          fuelDistribution,
          priorityDistribution,
        },
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching real-time dashboard data:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function getDispatchProgress(status: string): number {
  switch (status) {
    case "PROGRAMADO":
      return 0
    case "CARGANDO":
      return 25
    case "EN_RUTA":
      return 50
    case "DESCARGANDO":
      return 75
    case "COMPLETADO":
      return 100
    default:
      return 0
  }
}
