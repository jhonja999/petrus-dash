import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Get today's dispatches
    const todayDispatches = await prisma.dispatch.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lt: endOfDay
        }
      },
      include: {
        truck: {
          select: {
            placa: true,
            typefuel: true
          }
        },
        driver: {
          select: {
            name: true,
            lastname: true,
            email: true
          }
        },
        customer: {
          select: {
            companyname: true
          }
        },
        deliveries: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate metrics
    const totalDispatches = todayDispatches.length
    const gallonsDispatched = todayDispatches.reduce((sum, d) => 
      sum + Number(d.totalQuantity) - Number(d.remainingQuantity), 0
    )
    const dailyRevenue = todayDispatches.reduce((sum, d) => 
      sum + Number(d.total || 0), 0
    )

    // Get active drivers and trucks
    const activeDrivers = await prisma.user.count({
      where: {
        role: 'Operador',
        state: 'Activo'
      }
    })

    const activeTrucks = await prisma.truck.count({
      where: {
        state: 'Activo'
      }
    })

    // Calculate completed and pending deliveries
    const completedDeliveries = todayDispatches.filter(d => d.status === 'COMPLETADO').length
    const pendingDeliveries = totalDispatches - completedDeliveries

    // Fuel distribution
    const fuelDistribution: { [key: string]: number } = {}
    todayDispatches.forEach(dispatch => {
      const fuelType = dispatch.customFuelType || dispatch.fuelType
      fuelDistribution[fuelType] = (fuelDistribution[fuelType] || 0) + 1
    })

    // Convert to percentages
    Object.keys(fuelDistribution).forEach(fuel => {
      fuelDistribution[fuel] = Math.round((fuelDistribution[fuel] / totalDispatches) * 100)
    })

    // Recent dispatches for display
    const recentDispatches = todayDispatches.slice(0, 10).map(dispatch => ({
      dispatchNumber: dispatch.dispatchNumber,
      customer: dispatch.customer.companyname,
      driver: `${dispatch.driver.name} ${dispatch.driver.lastname}`,
      truck: dispatch.truck.placa,
      quantity: Number(dispatch.totalQuantity),
      fuelType: dispatch.customFuelType || dispatch.fuelType,
      status: dispatch.status,
      time: dispatch.scheduledDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      location: dispatch.manualLocation || 
        (dispatch.gpsLatitude && dispatch.gpsLongitude ? 
          `${Number(dispatch.gpsLatitude).toFixed(4)}, ${Number(dispatch.gpsLongitude).toFixed(4)}` : 
          null)
    }))

    // Generate alerts
    const alerts = []

    // Check for trucks with low fuel
    const trucksWithLowFuel = await prisma.truck.findMany({
      where: {
        lastRemaining: {
          lt: 500 // Less than 500 gallons
        },
        state: 'Activo'
      }
    })

    trucksWithLowFuel.forEach(truck => {
      alerts.push({
        type: 'warning',
        message: `Camión ${truck.placa} tiene combustible bajo: ${Number(truck.lastRemaining).toFixed(0)} galones`
      })
    })

    // Check for overdue dispatches
    const overdueDispatches = todayDispatches.filter(d => 
      d.status === 'PROGRAMADO' && 
      new Date(d.scheduledDate) < new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours overdue
    )

    if (overdueDispatches.length > 0) {
      alerts.push({
        type: 'error',
        message: `${overdueDispatches.length} despacho(s) con retraso de más de 2 horas`
      })
    }

    // Check truck maintenance
    const trucksInMaintenance = await prisma.truck.count({
      where: { state: 'Mantenimiento' }
    })

    if (trucksInMaintenance > 3) {
      alerts.push({
        type: 'warning',
        message: `${trucksInMaintenance} camiones en mantenimiento - capacidad reducida`
      })
    }

    const metrics = {
      totalDispatches,
      gallonsDispatched: Math.round(gallonsDispatched),
      dailyRevenue: Math.round(dailyRevenue),
      activeDrivers,
      activeTrucks,
      completedDeliveries,
      pendingDeliveries,
      fuelDistribution,
      recentDispatches,
      alerts
    }

    console.log(`✅ Dashboard metrics generated: ${totalDispatches} dispatches, ${gallonsDispatched} gallons`)

    return NextResponse.json(metrics)

  } catch (error) {
    console.error("❌ Error generating dashboard metrics:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}