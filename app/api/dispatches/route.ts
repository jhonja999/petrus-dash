import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

// Generate dispatch number in format PE-000001-2025
async function generateDispatchNumber(): Promise<string> {
  const year = new Date().getFullYear()
  
  // Get the last dispatch number for this year
  const lastDispatch = await prisma.dispatch.findFirst({
    where: { year },
    orderBy: { dispatchNumber: 'desc' }
  })
  
  let nextNumber = 1
  if (lastDispatch) {
    // Extract number from format PE-000001-2025
    const match = lastDispatch.dispatchNumber.match(/PE-(\d+)-\d{4}/)
    if (match) {
      nextNumber = parseInt(match[1]) + 1
    }
  }
  
  // Format as PE-000001-2025
  const paddedNumber = nextNumber.toString().padStart(6, '0')
  return `PE-${paddedNumber}-${year}`
}

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const formData = await request.formData()
    
    // Extract form fields
    const truckId = parseInt(formData.get('truckId') as string)
    const driverId = parseInt(formData.get('driverId') as string)
    const customerId = parseInt(formData.get('customerId') as string)
    const fuelType = formData.get('fuelType') as string
    const customFuelType = formData.get('customFuelType') as string
    const totalQuantity = parseFloat(formData.get('totalQuantity') as string)
    const pricePerGallon = parseFloat(formData.get('pricePerGallon') as string || '0')
    const locationMode = formData.get('locationMode') as string
    const manualLocation = formData.get('manualLocation') as string
    const gpsLatitude = formData.get('gpsLatitude') ? parseFloat(formData.get('gpsLatitude') as string) : null
    const gpsLongitude = formData.get('gpsLongitude') ? parseFloat(formData.get('gpsLongitude') as string) : null
    const scheduledDate = formData.get('scheduledDate') as string
    const scheduledTime = formData.get('scheduledTime') as string
    const initialKm = formData.get('initialKm') ? parseFloat(formData.get('initialKm') as string) : null
    const notes = formData.get('notes') as string
    const observations = formData.get('observations') as string
    const subtotal = parseFloat(formData.get('subtotal') as string || '0')
    const igv = parseFloat(formData.get('igv') as string || '0')
    const total = parseFloat(formData.get('total') as string || '0')

    // Validate required fields
    if (!truckId || !driverId || !customerId || !fuelType || !totalQuantity) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 })
    }

    // Validate truck capacity
    const truck = await prisma.truck.findUnique({
      where: { id: truckId }
    })

    if (!truck) {
      return NextResponse.json({ error: "Camión no encontrado" }, { status: 404 })
    }

    const availableCapacity = Number(truck.capacitygal) - Number(truck.currentLoad || 0)
    if (totalQuantity > availableCapacity) {
      return NextResponse.json({ 
        error: `Cantidad excede capacidad disponible (${availableCapacity.toFixed(2)} gal)` 
      }, { status: 400 })
    }

    // Generate dispatch number
    const dispatchNumber = await generateDispatchNumber()
    
    // Combine date and time
    const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime || '00:00'}:00`)

    // Create dispatch in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create dispatch
      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNumber,
          year: new Date().getFullYear(),
          status: 'PROGRAMADO',
          truckId,
          driverId,
          customerId,
          fuelType: fuelType as any,
          customFuelType: fuelType === 'CUSTOM' ? customFuelType : null,
          totalQuantity,
          remainingQuantity: totalQuantity,
          locationMode: locationMode as any,
          gpsLatitude,
          gpsLongitude,
          manualLocation: locationMode === 'MANUAL_INPUT' ? manualLocation : null,
          scheduledDate: scheduledDateTime,
          pricePerGallon: pricePerGallon || null,
          subtotal: subtotal || null,
          igv: igv || null,
          total: total || null,
          initialKm,
          notes: notes || null,
          observations: observations || null,
        }
      })

      // Update truck current load
      await tx.truck.update({
        where: { id: truckId },
        data: {
          currentLoad: {
            increment: totalQuantity
          },
          state: 'Asignado'
        }
      })

      return dispatch
    })

    // Handle photo uploads (simplified for now)
    const photoEntries = Array.from(formData.entries()).filter(([key]) => key.startsWith('photos_'))
    
    for (const [key, file] of photoEntries) {
      if (file instanceof File) {
        const [, photoType, index] = key.split('_')
        
        // In production, upload to ImageKit.io or similar service
        // For now, we'll just store metadata
        await prisma.dispatchPhoto.create({
          data: {
            dispatchId: result.id,
            photoType: photoType as any,
            filename: file.name,
            url: `/uploads/${result.id}/${file.name}`, // Placeholder URL
            size: file.size,
            mimeType: file.type,
            gpsLatitude,
            gpsLongitude,
          }
        })
      }
    }

    console.log(`✅ Dispatch created: ${dispatchNumber}`)

    return NextResponse.json({
      success: true,
      dispatch: result,
      dispatchNumber: result.dispatchNumber
    }, { status: 201 })

  } catch (error) {
    console.error("❌ Error creating dispatch:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date")

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status) where.status = status
    if (driverId) where.driverId = parseInt(driverId)
    if (date) {
      const targetDate = new Date(date)
      const nextDay = new Date(targetDate)
      nextDay.setDate(nextDay.getDate() + 1)
      
      where.scheduledDate = {
        gte: targetDate,
        lt: nextDay
      }
    }

    // Get dispatches with related data
    const [dispatches, total] = await Promise.all([
      prisma.dispatch.findMany({
        where,
        include: {
          truck: {
            select: {
              id: true,
              placa: true,
              capacitygal: true,
              typefuel: true
            }
          },
          driver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              corporateEmail: true
            }
          },
          customer: {
            select: {
              id: true,
              companyname: true,
              ruc: true,
              address: true
            }
          },
          deliveries: {
            include: {
              photos: true
            }
          },
          photos: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.dispatch.count({ where })
    ])

    return NextResponse.json({
      dispatches,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error("❌ Error fetching dispatches:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}