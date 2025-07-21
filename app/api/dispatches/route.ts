import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { DispatchStatus } from "@prisma/client"

// Mapeo de valores válidos de status
const VALID_DISPATCH_STATUSES: DispatchStatus[] = [
  "PROGRAMADO",
  "CARGANDO", 
  "EN_RUTA",
  "COMPLETADO",
  "CANCELADO"
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const statusParam = searchParams.get("status")
    const scheduledDate = searchParams.get("scheduledDate")
    const customerId = searchParams.get("customerId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")

    console.log("🔍 Fetching dispatches with params:", {
      driverId,
      statusParam,
      scheduledDate,
      customerId,
      page,
      limit
    })

    if (!driverId || isNaN(Number(driverId))) {
      return NextResponse.json({ 
        success: false, 
        error: "ID de conductor requerido y válido" 
      }, { status: 400 })
    }

    // Base where clause
    const where: any = {
      driverId: Number(driverId)
    }

    // ✅ Procesar status correctamente - puede venir como string concatenado
    if (statusParam && statusParam.trim()) {
      // Dividir por comas y limpiar espacios
      const statusArray = statusParam.split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .filter(s => VALID_DISPATCH_STATUSES.includes(s as DispatchStatus))

      if (statusArray.length === 1) {
        // Si es un solo status
        where.status = statusArray[0] as DispatchStatus
      } else if (statusArray.length > 1) {
        // Si son múltiples status, usar el operador 'in'
        where.status = {
          in: statusArray as DispatchStatus[]
        }
      }
      
      console.log("🔍 Processed status filter:", where.status)
    }

    // Filtrar por fecha si se proporciona
    if (scheduledDate) {
      const targetDate = new Date(scheduledDate)
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))
      
      where.scheduledDate = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    // Filtrar por cliente si se proporciona
    if (customerId && !isNaN(Number(customerId))) {
      where.customerId = Number(customerId)
    }

    console.log("🔍 Final where clause:", JSON.stringify(where, null, 2))

    // Calcular offset para paginación
    const offset = (page - 1) * limit

    try {
      // Obtener despachos y total con manejo de errores mejorado
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
                typefuel: true
              }
            },
            driver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                role: true
              }
            },
            customer: {
              select: {
                id: true,
                companyname: true,
                ruc: true,
                address: true,
                defaultLatitude: true,
                defaultLongitude: true
              }
            }
          },
          orderBy: [
            { scheduledDate: "asc" },
            { createdAt: "desc" }
          ],
          skip: offset,
          take: limit
        }),
        prisma.dispatch.count({
          where
        })
      ])

      console.log(`✅ Found ${dispatches.length} dispatches (${total} total) for driver ${driverId}`)

      // Calcular información de paginación
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
          hasPrevPage
        }
      })

    } catch (prismaError) {
      console.error("❌ Prisma query error:", prismaError)
      
      // Manejo específico de errores de Prisma
      if (prismaError instanceof Error) {
        if (prismaError.message.includes("Invalid") || prismaError.message.includes("validation")) {
          return NextResponse.json({ 
            success: false, 
            error: "Parámetros de consulta inválidos",
            details: "Verifique los filtros aplicados"
          }, { status: 400 })
        } else if (prismaError.message.includes("connect") || prismaError.message.includes("timeout")) {
          return NextResponse.json({ 
            success: false, 
            error: "Error de conexión a la base de datos",
            details: "Intente de nuevo en unos momentos"
          }, { status: 503 })
        }
      }
      
      throw prismaError // Re-lanzar si no es un error conocido
    }

  } catch (error) {
    console.error("❌ Dispatches API Error:", error)
    
    let errorMessage = "Error interno del servidor"
    let errorDetails = "Error desconocido"
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      errorDetails = error.stack || error.message
      
      // Categorizar tipos de error
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
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: statusCode })
  }
}

// ✅ Agregar método POST para crear nuevos dispatches
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      truckId, 
      driverId, 
      customerId, 
      fuelType, 
      quantity, 
      deliveryAddress, 
      deliveryLatitude,
      deliveryLongitude,
      scheduledDate,
      priority = "NORMAL",
      notes
    } = body

    // Validaciones básicas
    if (!truckId || !driverId || !customerId || !quantity) {
      return NextResponse.json({ 
        success: false, 
        error: "Campos requeridos: truckId, driverId, customerId, quantity" 
      }, { status: 400 })
    }

    // Generar número de despacho único
    const currentYear = new Date().getFullYear()
    
    // Buscar o crear secuencia para el año actual
    let sequence = await prisma.dispatchSequence.findUnique({
      where: { year: currentYear }
    })

    if (!sequence) {
      sequence = await prisma.dispatchSequence.create({
        data: { year: currentYear, lastNumber: 0 }
      })
    }

    // Incrementar y obtener siguiente número
    const nextNumber = sequence.lastNumber + 1
    await prisma.dispatchSequence.update({
      where: { year: currentYear },
      data: { lastNumber: nextNumber }
    })

    // Generar número de despacho con formato PE-000001-2025
    const dispatchNumber = `PE-${nextNumber.toString().padStart(6, '0')}-${currentYear}`

    // Crear el despacho
    const newDispatch = await prisma.dispatch.create({
      data: {
        dispatchNumber,
        year: currentYear,
        truckId: Number(truckId),
        driverId: Number(driverId),
        customerId: Number(customerId),
        fuelType,
        quantity: Number(quantity),
        deliveryAddress,
        deliveryLatitude: deliveryLatitude ? Number(deliveryLatitude) : null,
        deliveryLongitude: deliveryLongitude ? Number(deliveryLongitude) : null,
        scheduledDate: new Date(scheduledDate),
        priority,
        status: "PROGRAMADO",
        notes
      },
      include: {
        truck: true,
        driver: true,
        customer: true
      }
    })

    console.log("✅ New dispatch created:", newDispatch.dispatchNumber)

    return NextResponse.json({
      success: true,
      data: newDispatch,
      message: `Despacho ${dispatchNumber} creado exitosamente`
    })

  } catch (error) {
    console.error("❌ Create Dispatch Error:", error)
    return NextResponse.json({ 
      success: false,
      error: "Error al crear el despacho",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}

// ✅ Método PUT para actualizar dispatches
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: "ID del despacho requerido" 
      }, { status: 400 })
    }

    // Actualizar timestamps según el status
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
        customer: true
      }
    })

    console.log("✅ Dispatch updated:", updatedDispatch.dispatchNumber)

    return NextResponse.json({
      success: true,
      data: updatedDispatch,
      message: "Despacho actualizado exitosamente"
    })

  } catch (error) {
    console.error("❌ Update Dispatch Error:", error)
    return NextResponse.json({ 
      success: false,
      error: "Error al actualizar el despacho",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}