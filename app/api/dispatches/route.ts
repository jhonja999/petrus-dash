import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { generateDispatchNumber } from "@/lib/dispatch-numbering"
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

    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const driverId = searchParams.get("driverId")
    const truckId = searchParams.get("truckId")
    const customerId = searchParams.get("customerId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    // Construir filtros
    const where: any = {}
    if (status) where.status = status
    if (driverId) where.driverId = Number.parseInt(driverId)
    if (truckId) where.truckId = Number.parseInt(truckId)
    if (customerId) where.customerId = Number.parseInt(customerId)

    // Obtener despachos con paginación
    const [dispatches, total] = await Promise.all([
      prisma.dispatch.findMany({
        where,
        include: {
          truck: true,
          driver: true,
          customer: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.dispatch.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: dispatches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching dispatches:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
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
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json(
        { error: "Acceso denegado. Solo administradores pueden crear despachos." },
        { status: 403 },
      )
    }

    const body = await request.json()
    const {
      truckId,
      driverId,
      customerId,
      fuelType,
      customFuelName,
      quantity,
      locationGPS,
      locationManual,
      address,
      scheduledDate,
      notes,
      priority = "NORMAL",
    } = body

    // Validaciones básicas
    if (!truckId || !driverId || !customerId || !fuelType || !quantity || !address || !scheduledDate) {
      return NextResponse.json({ error: "Todos los campos obligatorios deben ser completados" }, { status: 400 })
    }

    if (quantity <= 0) {
      return NextResponse.json({ error: "La cantidad debe ser mayor a 0" }, { status: 400 })
    }

    // Verificar que el camión existe y obtener su información
    const truckFromDB = await prisma.truck.findUnique({
      where: { id: Number.parseInt(truckId) },
    })

    if (!truckFromDB) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    // Validar capacidad del camión - manejar campos opcionales
    const requestedQuantity = Number.parseFloat(quantity)
    const currentLoad = Number(truckFromDB.currentLoad) || 0
    const maxCapacity = Number(truckFromDB.maxCapacity || truckFromDB.capacitygal)

    // Validación manual de capacidad
    const totalAfterAssignment = currentLoad + requestedQuantity
    if (totalAfterAssignment > maxCapacity) {
      return NextResponse.json(
        {
          error: `La cantidad solicitada (${requestedQuantity} gal) excede la capacidad disponible. Capacidad máxima: ${maxCapacity} gal, Carga actual: ${currentLoad} gal, Disponible: ${maxCapacity - currentLoad} gal`,
        },
        { status: 400 },
      )
    }

    // Verificar que el conductor existe
    const driver = await prisma.user.findUnique({
      where: { id: Number.parseInt(driverId) },
    })

    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado" }, { status: 404 })
    }

    // Verificar que el cliente existe
    const customer = await prisma.customer.findUnique({
      where: { id: Number.parseInt(customerId) },
    })

    if (!customer) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    // Generar número de despacho
    const dispatchNumber = await generateDispatchNumber()
    const currentYear = new Date().getFullYear()

    // Preparar datos de ubicación
    const deliveryLatitude = locationGPS?.latitude ? Number.parseFloat(locationGPS.latitude) : null
    const deliveryLongitude = locationGPS?.longitude ? Number.parseFloat(locationGPS.longitude) : null
    const locationMethod = locationGPS?.latitude ? "GPS_AUTO" : locationManual ? "GPS_MANUAL" : "OFFICE_PLANNED"

    // Validar el enum de prioridad
    const validPriorities = ["NORMAL", "ALTA", "URGENTE"]
    const dispatchPriority = validPriorities.includes(priority) ? priority : "NORMAL"

    // Crear el despacho
    const dispatch = await prisma.dispatch.create({
      data: {
        dispatchNumber,
        year: currentYear,
        truckId: Number.parseInt(truckId),
        driverId: Number.parseInt(driverId),
        customerId: Number.parseInt(customerId),
        fuelType,
        customFuelName: fuelType === "PERSONALIZADO" ? customFuelName : null,
        quantity: requestedQuantity,
        deliveryLatitude,
        deliveryLongitude,
        deliveryAddress: address,
        locationMethod,
        scheduledDate: new Date(scheduledDate),
        notes,
        priority: dispatchPriority,
        status: "PROGRAMADO",
      },
      include: {
        truck: true,
        driver: true,
        customer: true,
      },
    })

    // Actualizar la carga actual del camión
    await prisma.truck.update({
      where: { id: Number.parseInt(truckId) },
      data: {
        currentLoad: {
          increment: requestedQuantity,
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: dispatch,
        message: `Despacho ${dispatchNumber} creado exitosamente`,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Error creating dispatch:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
