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

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get("dateRange") || "today"

    // Calculate date ranges
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    let startDate: Date
    let endDate: Date = new Date()

    switch (dateRange) {
      case "yesterday":
        startDate = yesterday
        endDate = today
        break
      case "week":
        startDate = thisWeek
        break
      case "month":
        startDate = thisMonth
        break
      case "today":
      default:
        startDate = today
        break
    }

    // Get dispatch metrics
    const [
      totalDispatches,
      todayDispatches,
      completedToday,
      activeDispatches,
      pendingDispatches,
      cancelledToday,
      dispatchesWithQuantity,
      todayDispatchesWithQuantity,
    ] = await Promise.all([
      // Total dispatches ever
      prisma.dispatch.count(),

      // Today's dispatches
      prisma.dispatch.count({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),

      // Completed today
      prisma.dispatch.count({
        where: {
          status: "COMPLETADO",
          completedAt: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),

      // Active dispatches (in progress)
      prisma.dispatch.count({
        where: {
          status: {
            in: ["CARGANDO", "EN_RUTA"],
          },
        },
      }),

      // Pending dispatches
      prisma.dispatch.count({
        where: {
          status: "PROGRAMADO",
        },
      }),

      // Cancelled today
      prisma.dispatch.count({
        where: {
          status: "CANCELADO",
          updatedAt: {
            gte: startDate,
            lt: endDate,
          },
        },
      }),

      // All dispatches with quantity for total gallons
      prisma.dispatch.findMany({
        select: {
          quantity: true,
          status: true,
        },
      }),

      // Today's dispatches with quantity
      prisma.dispatch.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          quantity: true,
          status: true,
        },
      }),
    ])

    // Calculate gallons and revenue
    const totalGallons = dispatchesWithQuantity.reduce((sum, d) => sum + Number(d.quantity), 0)
    const todayGallons = todayDispatchesWithQuantity.reduce((sum, d) => sum + Number(d.quantity), 0)

    // Estimate revenue (using average price of S/ 12.50 per gallon)
    const avgPricePerGallon = 12.5
    const completedDispatches = dispatchesWithQuantity.filter((d) => d.status === "COMPLETADO")
    const totalRevenue = completedDispatches.reduce((sum, d) => sum + Number(d.quantity) * avgPricePerGallon, 0)

    const todayCompletedDispatches = todayDispatchesWithQuantity.filter((d) => d.status === "COMPLETADO")
    const todayRevenue = todayCompletedDispatches.reduce((sum, d) => sum + Number(d.quantity) * avgPricePerGallon, 0)

    const metrics = {
      totalDispatches,
      todayDispatches,
      completedToday,
      totalGallons: Math.round(totalGallons),
      todayGallons: Math.round(todayGallons),
      totalRevenue: Math.round(totalRevenue),
      todayRevenue: Math.round(todayRevenue),
      activeDispatches,
      pendingDispatches,
      cancelledToday,
    }

    return NextResponse.json({
      success: true,
      data: metrics,
    })
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
