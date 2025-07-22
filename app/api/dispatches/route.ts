import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { DispatchStatus } from "@prisma/client"
import { generateDispatchNumber } from "@/lib/dispatch-numbering" // Import the sequential number generator

// Mapeo de valores válidos de status
const VALID_DISPATCH_STATUSES: DispatchStatus[] = ["PROGRAMADO", "CARGANDO", "EN_RUTA", "COMPLETADO", "CANCELADO"]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const statusParam = searchParams.get("status")
    const scheduledDate = searchParams.get("scheduledDate")
    const customerId = searchParams.get("customerId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    console.log("🔍 Fetching dispatches with params:", {
      driverId,
      statusParam,
      scheduledDate,
      customerId,
      page,
      limit,
    })

    if (!driverId || isNaN(Number(driverId))) {
      return NextResponse.json(
        {
          success: false,
          error: "ID de conductor requerido y válido",
        },
        { status: 400 },
      )
    }

    // Base where clause
    const where: any = {
      driverId: Number(driverId),
    }

    // ✅ Procesar status correctamente - puede venir como string concatenado
    if (statusParam && statusParam.trim()) {
      const statusArray = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .filter((s) => VALID_DISPATCH_STATUSES.includes(s as DispatchStatus))

      if (statusArray.length === 1) {
        where.status = statusArray[0] as DispatchStatus
      } else if (statusArray.length > 1) {
        where.status = {
          in: statusArray as DispatchStatus[],
        }
      }

      console.log("🔍 Processed status filter:", where.status)
    }

    if (scheduledDate) {
      const targetDate = new Date(scheduledDate)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

      where.scheduledDate = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    if (customerId && !isNaN(Number(customerId))) {
      where.customerId = Number(customerId)
    }

    console.log("🔍 Final where clause:", JSON.stringify(where, null, 2))

    const offset = (page - 1) * limit

    try {
      const [dispatches, total] = await Promise.all([
        prisma.dispatch.findMany({
          where,
          include: {
            truck: {
              select: {
                id: true,
                placa: true,
                capacitygal: true,
                currentLoad: true,
                state: true,
                typefuel: true,
              },
            },
            driver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                role: true,
              },
            },
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
                address: true,
                defaultLatitude: true,
                defaultLongitude: true,
              },
            },
          },
          orderBy: [{ scheduledDate: "asc" }, { createdAt: "desc" }],
          skip: offset,
          take: limit,
        }),
        prisma.dispatch.count({
          where,
        }),
      ])

      console.log(`✅ Found ${dispatches.length} dispatches (${total} total) for driver ${driverId}`)

      const totalPages = Math.ceil(total / limit)
      const hasNextPage = page < totalPages
      const hasPrevPage = page > 1

      return NextResponse.json({
        success: true,
        data: dispatches,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
      })
    } catch (prismaError) {
      console.error("❌ Prisma query error:", prismaError)

      if (prismaError instanceof Error) {
        if (prismaError.message.includes("Invalid") || prismaError.message.includes("validation")) {
          return NextResponse.json(
            {
              success: false,
              error: "Parámetros de consulta inválidos",
              details: "Verifique los filtros aplicados",
            },
            { status: 400 },
          )
        } else if (prismaError.message.includes("connect") || prismaError.message.includes("timeout")) {
          return NextResponse.json(
            {
              success: false,
              error: "Error de conexión a la base de datos",
              details: "Intente de nuevo en unos momentos",
            },
            { status: 503 },
          )
        }
      }

      throw prismaError
    }
  } catch (error) {
    console.error("❌ Dispatches API Error:", error)

    let errorMessage = "Error interno del servidor"
    let errorDetails = "Error desconocido"
    let statusCode = 500

    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || error.message

      if (error.message.includes("Invalid") || error.message.includes("validation")) {
        statusCode = 400
        errorMessage = "Error de validación en los parámetros"
      } else if (error.message.includes("not found") || error.message.includes("NotFound")) {
        statusCode = 404
        errorMessage = "Recurso no encontrado"
      } else if (error.message.includes("connect") || error.message.includes("timeout")) {
        statusCode = 503
        errorMessage = "Servicio no disponible temporalmente"
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: statusCode },
    )
  }
}

// ✅ Método POST
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      truckId,
      driverId,
      customerId,
      fuelType,
      customFuelName,
      quantity,
      address,
      locationGPS,
      locationManual,
      locationMethod, // Se extrae desde body correctamente
      scheduledDate,
      priority = "NORMAL",
      notes,
      photos,
      loadingLocation,
    } = body

    console.log("📝 Creating dispatch with data:", {
      truckId,
      driverId,
      customerId,
      fuelType,
      customFuelName,
      quantity,
      address,
      locationGPS,
      locationManual,
      locationMethod,
      scheduledDate,
      priority,
      notes,
      photos: photos ? photos.length : 0,
      loadingLocation,
    })

    if (!truckId || !driverId || !customerId || !quantity) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos requeridos: truckId, driverId, customerId, quantity",
        },
        { status: 400 },
      )
    }

    if (!address) {
      return NextResponse.json(
        {
          success: false,
          error: "La dirección de entrega es requerida",
        },
        { status: 400 },
      )
    }

    if (fuelType === "PERSONALIZADO" && (!customFuelName || customFuelName.trim().length < 3)) {
      return NextResponse.json(
        {
          success: false,
          error: "El nombre del combustible personalizado es requerido y debe tener al menos 3 caracteres.",
        },
        { status: 400 },
      )
    }

    const dispatchNumber = await generateDispatchNumber()

    let deliveryLatitude: number | null = null
    let deliveryLongitude: number | null = null

    if (locationGPS && typeof locationGPS === "string") {
      const coords = locationGPS.split(",").map((coord: string) => Number.parseFloat(coord.trim()))
      if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
        deliveryLatitude = coords[0]
        deliveryLongitude = coords[1]
      }
    }

    const loadingAddress = loadingLocation?.address || null
    const loadingLatitude = loadingLocation?.latitude || null
    const loadingLongitude = loadingLocation?.longitude || null

    const newDispatch = await prisma.dispatch.create({
      data: {
        dispatchNumber,
        year: new Date().getFullYear(),
        truckId: Number(truckId),
        driverId: Number(driverId),
        customerId: Number(customerId),
        fuelType,
        customFuelName: fuelType === "PERSONALIZADO" ? customFuelName : null,
        quantity: Number(quantity),
        deliveryAddress: address,
        deliveryLatitude,
        deliveryLongitude,
        locationMethod: locationMethod || (locationManual ? "MANUAL" : "GPS"),
        scheduledDate: new Date(scheduledDate),
        priority,
        status: "PROGRAMADO",
        notes: notes || null,
        photos: photos || [],
        pickupAddress: loadingAddress,
        pickupLatitude: loadingLatitude,
        pickupLongitude: loadingLongitude,
      },
      include: {
        truck: true,
        driver: true,
        customer: true,
      },
    })

    console.log("✅ New dispatch created:", newDispatch.dispatchNumber)

    return NextResponse.json({
      success: true,
      data: newDispatch,
      message: `Despacho ${dispatchNumber} creado exitosamente`,
    })
  } catch (error) {
    console.error("❌ Create Dispatch Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear el despacho",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

// ✅ Método PUT
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: "ID del despacho requerido",
        },
        { status: 400 },
      )
    }

    if (updateData.status) {
      const now = new Date()
      switch (updateData.status) {
        case "CARGANDO":
          updateData.startedAt = now
          break
        case "EN_RUTA":
          updateData.loadedAt = now
          break
        case "COMPLETADO":
          updateData.completedAt = now
          break
      }
    }

    const updatedDispatch = await prisma.dispatch.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        truck: true,
        driver: true,
        customer: true,
      },
    })

    console.log("✅ Dispatch updated:", updatedDispatch.dispatchNumber)

    return NextResponse.json({
      success: true,
      data: updatedDispatch,
      message: "Despacho actualizado exitosamente",
    })
  } catch (error) {
    console.error("❌ Update Dispatch Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar el despacho",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
