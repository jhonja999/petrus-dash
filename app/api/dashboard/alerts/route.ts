import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma" // Assuming prisma is correctly imported from lib/prisma
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"
import { Role } from "@prisma/client" // Import Role enum

interface Alert {
  id: string
  type: "warning" | "error" | "info"
  priority: "high" | "medium" | "low"
  title: string
  message: string
  entityType: string
  entityId: number
  timestamp: string
  icon: string
}

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

    const alerts: Alert[] = []

    // Check for low fuel trucks (using lastRemaining field)
    const lowFuelTrucks = await prisma.truck.findMany({
      where: {
        lastRemaining: { lt: 100 },
        state: "Activo",
      },
      select: {
        id: true,
        placa: true,
        lastRemaining: true,
        typefuel: true,
      },
    })

    lowFuelTrucks.forEach((truck) => {
      alerts.push({
        id: `fuel-${truck.id}`,
        type: "warning",
        priority: "high",
        title: "Combustible Bajo",
        message: `Camión ${truck.placa} tiene ${Number(truck.lastRemaining)} galones restantes`,
        entityType: "truck",
        entityId: truck.id,
        timestamp: new Date().toISOString(),
        icon: "fuel",
      })
    })

    // Check for trucks needing maintenance
    const maintenanceTrucks = await prisma.truck.findMany({
      where: {
        state: "Mantenimiento",
      },
      select: {
        id: true,
        placa: true,
        lastMaintenanceDate: true,
      },
    })

    maintenanceTrucks.forEach((truck) => {
      alerts.push({
        id: `maintenance-${truck.id}`,
        type: "info",
        priority: "medium",
        title: "Mantenimiento Programado",
        message: `Camión ${truck.placa} requiere mantenimiento`,
        entityType: "truck",
        entityId: truck.id,
        timestamp: new Date().toISOString(),
        icon: "wrench",
      })
    })

    // Check for delayed dispatches
    const delayedDispatches = await prisma.dispatch.findMany({
      where: {
        status: "EN_RUTA",
        scheduledDate: {
          lt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
      },
      include: {
        truck: {
          select: {
            placa: true,
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
    })

    delayedDispatches.forEach((dispatch) => {
      alerts.push({
        id: `delay-${dispatch.id}`,
        type: "error",
        priority: "high",
        title: "Despacho Retrasado",
        message: `Vale ${dispatch.dispatchNumber} - ${dispatch.customer.companyname} está retrasado`,
        entityType: "dispatch",
        entityId: dispatch.id,
        timestamp: new Date().toISOString(),
        icon: "clock",
      })
    })

    // Check for inactive drivers
    const inactiveDrivers = await prisma.user.findMany({
      where: {
        role: Role.OPERADOR, // Corrected enum usage
        state: "Inactivo",
      },
      select: {
        id: true,
        name: true,
        lastname: true,
      },
    })

    inactiveDrivers.forEach((driver) => {
      alerts.push({
        id: `driver-${driver.id}`,
        type: "warning",
        priority: "low",
        title: "Conductor Inactivo",
        message: `${driver.name} ${driver.lastname} está marcado como inactivo`,
        entityType: "driver",
        entityId: driver.id,
        timestamp: new Date().toISOString(),
        icon: "user-x",
      })
    })

    // Sort alerts by priority and timestamp
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    alerts.sort((a, b) => {
      const priorityDiff =
        priorityOrder[b.priority as keyof typeof priorityOrder] -
        priorityOrder[a.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    return NextResponse.json({
      success: true,
      data: alerts,
      summary: {
        total: alerts.length,
        high: alerts.filter((a) => a.priority === "high").length,
        medium: alerts.filter((a) => a.priority === "medium").length,
        low: alerts.filter((a) => a.priority === "low").length,
      },
    })
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { alertId, action } = body

    if (action === "dismiss") {
      // In a real implementation, you might want to store dismissed alerts
      // For now, we'll just return success
      return NextResponse.json({
        success: true,
        message: "Alerta descartada",
      })
    }

    if (action === "resolve") {
      // Handle alert resolution based on alert type
      const [entityType, entityId] = alertId.split("-")

      if (entityType === "fuel") {
        // Mark truck as needing fuel
        await prisma.truck.update({
          where: { id: Number.parseInt(entityId) },
          data: { state: "Mantenimiento" },
        })
      }

      if (entityType === "maintenance") {
        // Update maintenance status
        await prisma.truck.update({
          where: { id: Number.parseInt(entityId) },
          data: {
            lastMaintenanceDate: new Date(),
            state: "Activo",
          },
        })
      }

      if (entityType === "delay") {
        // Update dispatch priority
        await prisma.dispatch.update({
          where: { id: Number.parseInt(entityId) },
          data: { priority: "ALTA" },
        })
      }

      return NextResponse.json({
        success: true,
        message: "Alerta resuelta",
      })
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error handling alert action:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
