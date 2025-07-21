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
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Obtener camiones con sus estadísticas
    const trucks = await prisma.truck.findMany({
      include: {
        truckStats: {
          orderBy: { date: "desc" },
          take: 30, // Últimos 30 días
        },
        truckLocations: {
          orderBy: { createdAt: "desc" },
          take: 1, // Ubicación más reciente
        },
        dispatches: {
          where: {
            status: {
              in: ["PROGRAMADO", "CARGANDO", "EN_RUTA"],
            },
          },
          include: {
            customer: true,
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Calcular estadísticas agregadas para cada camión
    const truckHistories = await Promise.all(
      trucks.map(async (truck) => {
        // Obtener estadísticas totales
        const totalStats = await prisma.dispatch.aggregate({
          where: {
            truckId: truck.id,
            status: "COMPLETADO",
          },
          _count: { id: true },
          _sum: { quantity: true },
        })

        // Calcular estadísticas de los últimos 30 días
        const recentStats = truck.truckStats.reduce(
          (acc, stat) => {
            acc.totalKilometers += Number(stat.totalKilometers)
            acc.totalGallons += Number(stat.totalGallonsDelivered)
            acc.totalDispatches += stat.totalDispatches
            if (stat.fuelEfficiency) {
              acc.efficiencySum += Number(stat.fuelEfficiency)
              acc.efficiencyCount += 1
            }
            return acc
          },
          {
            totalKilometers: 0,
            totalGallons: 0,
            totalDispatches: 0,
            efficiencySum: 0,
            efficiencyCount: 0,
          },
        )

        const averageEfficiency =
          recentStats.efficiencyCount > 0 ? recentStats.efficiencySum / recentStats.efficiencyCount : 0

        // Obtener actividad reciente del historial
        const recentActivity = await prisma.historyRecord.findMany({
          where: {
            entityType: "TRUCK",
            entityId: truck.id,
          },
          include: {
            user: {
              select: {
                name: true,
                lastname: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })

        return {
          truckId: truck.id,
          truck: {
            placa: truck.placa,
            typefuel: truck.typefuel,
            capacitygal: Number(truck.capacitygal),
            state: truck.state,
          },
          totalDispatches: totalStats._count.id || 0,
          totalGallons: Number(totalStats._sum.quantity || 0),
          totalKilometers: Number(truck.totalKilometers),
          averageEfficiency,
          lastMaintenance: truck.lastMaintenanceDate?.toISOString(),
          nextMaintenance: truck.nextMaintenanceDate?.toISOString(),
          currentLocation: truck.truckLocations[0]
            ? {
                latitude: Number(truck.truckLocations[0].latitude),
                longitude: Number(truck.truckLocations[0].longitude),
                address: truck.truckLocations[0].address || "Ubicación no disponible",
                timestamp: truck.truckLocations[0].createdAt.toISOString(),
              }
            : undefined,
          currentAssignment: truck.dispatches[0]
            ? {
                dispatchId: truck.dispatches[0].id,
                dispatchNumber: truck.dispatches[0].dispatchNumber,
                status: truck.dispatches[0].status,
                customer: truck.dispatches[0].customer.companyname,
              }
            : undefined,
          recentActivity: recentActivity.map((activity) => ({
            id: activity.id,
            type: activity.eventType.toLowerCase().replace("_", ""),
            entityId: activity.entityId,
            entityType: activity.entityType.toLowerCase(),
            action: activity.action,
            description: activity.description,
            metadata: activity.metadata,
            timestamp: activity.createdAt.toISOString(),
            userId: activity.userId,
            user: activity.user,
          })),
        }
      }),
    )

    return NextResponse.json({
      success: true,
      data: truckHistories,
    })
  } catch (error) {
    console.error("Error fetching truck histories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
