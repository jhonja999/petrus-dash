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

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}

    if (status && status !== "all") {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {}
      if (dateFrom) {
        where.scheduledDate.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.scheduledDate.lte = new Date(dateTo + "T23:59:59.999Z")
      }
    }

    // Obtener despachos con relaciones para trazabilidad
    const [dispatches, total] = await Promise.all([
      prisma.dispatch.findMany({
        where,
        include: {
          truck: true,
          driver: true,
          customer: true,
          locations: {
            orderBy: { createdAt: "asc" },
          },
          partialDeliveries: {
            orderBy: { deliveredAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dispatch.count({ where }),
    ])

    // Generar registros de trazabilidad completa
    const traceabilityRecords = dispatches.map((dispatch) => {
      const baseQuantity = Number(dispatch.quantity)

      // Obtener entregas parciales reales de la base de datos
      const partialDeliveries = dispatch.partialDeliveries.map((delivery) => ({
        id: delivery.id,
        quantity: Number(delivery.quantity),
        location: delivery.address || "Ubicación no especificada",
        timestamp: delivery.deliveredAt.toISOString(),
        remainingBalance: Number(delivery.remainingBalance),
        marcadorInicial: delivery.marcadorInicial ? Number(delivery.marcadorInicial) : undefined,
        marcadorFinal: delivery.marcadorFinal ? Number(delivery.marcadorFinal) : undefined,
        coordinates:
          delivery.latitude && delivery.longitude
            ? {
                latitude: delivery.latitude,
                longitude: delivery.longitude,
              }
            : undefined,
      }))

      // Obtener rastro GPS real de las ubicaciones
      const gpsTrail = dispatch.locations.map((location) => ({
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        timestamp: location.createdAt.toISOString(),
        speed: location.speed || undefined,
        heading: location.heading || undefined,
        accuracy: location.accuracy || undefined,
        altitude: location.altitude || undefined,
      }))

      return {
        id: dispatch.id,
        dispatchId: dispatch.id,
        dispatchNumber: dispatch.dispatchNumber,
        truckPlaca: dispatch.truck.placa,
        driverName: `${dispatch.driver.name} ${dispatch.driver.lastname}`,
        customerName: dispatch.customer.companyname,
        quantity: baseQuantity,
        fuelType:
          dispatch.fuelType === "PERSONALIZADO" ? dispatch.customFuelName || "Personalizado" : dispatch.fuelType,
        deliveryAddress: dispatch.deliveryAddress,
        status: dispatch.status,
        scheduledDate: dispatch.scheduledDate.toISOString(),
        startedAt: dispatch.startedAt?.toISOString(),
        loadedAt: dispatch.loadedAt?.toISOString(),
        arrivedAt: dispatch.arrivedAt?.toISOString(),
        completedAt: dispatch.completedAt?.toISOString(),
        gpsTrail,
        partialDeliveries,
        // Información adicional
        priority: dispatch.priority,
        notes: dispatch.notes,
        pickupAddress: dispatch.pickupAddress,
        locationMethod: dispatch.locationMethod,
      }
    })

    return NextResponse.json({
      success: true,
      data: traceabilityRecords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching traceability records:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
