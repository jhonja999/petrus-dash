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

    // Obtener conductores (usuarios con rol OPERADOR)
    const drivers = await prisma.user.findMany({
      where: {
        role: "OPERADOR",
        state: {
          not: "Eliminado",
        },
      },
      include: {
        driverStats: {
          orderBy: { date: "desc" },
          take: 30, // Últimos 30 días
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

    // Calcular estadísticas agregadas para cada conductor
    const driverHistories = await Promise.all(
      drivers.map(async (driver) => {
        // Obtener estadísticas totales
        const totalStats = await prisma.dispatch.aggregate({
          where: {
            driverId: driver.id,
            status: "COMPLETADO",
          },
          _count: { id: true },
          _sum: { quantity: true },
        })

        const totalDispatchesCount = await prisma.dispatch.count({
          where: {
            driverId: driver.id,
          },
        })

        const completedDispatchesCount = await prisma.dispatch.count({
          where: {
            driverId: driver.id,
            status: "COMPLETADO",
          },
        })

        // Calcular estadísticas de los últimos 30 días
        const recentStats = driver.driverStats.reduce(
          (acc, stat) => {
            acc.totalKilometers += Number(stat.totalKilometers)
            acc.totalGallons += Number(stat.totalGallonsDelivered)
            acc.totalDispatches += stat.totalDispatches
            if (stat.averageRating) {
              acc.ratingSum += Number(stat.averageRating)
              acc.ratingCount += 1
            }
            acc.onTimeDeliveries += stat.onTimeDeliveries
            acc.lateDeliveries += stat.lateDeliveries
            return acc
          },
          {
            totalKilometers: 0,
            totalGallons: 0,
            totalDispatches: 0,
            ratingSum: 0,
            ratingCount: 0,
            onTimeDeliveries: 0,
            lateDeliveries: 0,
          },
        )

        const averageRating = recentStats.ratingCount > 0 ? recentStats.ratingSum / recentStats.ratingCount : 4.0

        const completionRate = totalDispatchesCount > 0 ? (completedDispatchesCount / totalDispatchesCount) * 100 : 0

        // Obtener última actividad
        const lastActivity = await prisma.historyRecord.findFirst({
          where: {
            userId: driver.id,
          },
          orderBy: { createdAt: "desc" },
        })

        // Obtener actividad reciente del historial
        const recentActivity = await prisma.historyRecord.findMany({
          where: {
            OR: [
              { userId: driver.id },
              {
                entityType: "USER",
                entityId: driver.id,
              },
            ],
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
          driverId: driver.id,
          driver: {
            name: driver.name,
            lastname: driver.lastname,
            email: driver.email,
            dni: driver.dni,
          },
          totalDispatches: totalStats._count.id || 0,
          totalGallons: Number(totalStats._sum.quantity || 0),
          totalKilometers: recentStats.totalKilometers,
          averageRating,
          completionRate,
          lastActivity: lastActivity?.createdAt.toISOString(),
          currentAssignment: driver.dispatches[0]
            ? {
                dispatchId: driver.dispatches[0].id,
                dispatchNumber: driver.dispatches[0].dispatchNumber,
                status: driver.dispatches[0].status,
                customer: driver.dispatches[0].customer.companyname,
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
      data: driverHistories,
    })
  } catch (error) {
    console.error("Error fetching driver histories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
