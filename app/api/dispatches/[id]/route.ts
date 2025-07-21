import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const dispatchId = Number.parseInt(id)

    if (Number.isNaN(dispatchId)) {
      return NextResponse.json({ error: "Invalid dispatch ID" }, { status: 400 })
    }

    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        truck: true,
        driver: true,
        customer: true,
      },
    })

    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: dispatch,
    })
  } catch (error) {
    console.error("Error fetching dispatch:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const dispatchId = Number.parseInt(id)

    if (Number.isNaN(dispatchId)) {
      return NextResponse.json({ error: "Invalid dispatch ID" }, { status: 400 })
    }

    const body = await request.json()

    // Verificar que el despacho existe
    const existingDispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { truck: true },
    })

    if (!existingDispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
    }

    // Solo permitir edición si está en estado BORRADOR o PROGRAMADO
    if (!["BORRADOR", "PROGRAMADO"].includes(existingDispatch.status)) {
      return NextResponse.json({ error: "Cannot edit dispatch in current status" }, { status: 400 })
    }

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
      status,
    } = body

    // Preparar datos de actualización
    const updateData: any = {}

    if (truckId !== undefined) updateData.truckId = Number.parseInt(truckId)
    if (driverId !== undefined) updateData.driverId = Number.parseInt(driverId)
    if (customerId !== undefined) updateData.customerId = Number.parseInt(customerId)
    if (fuelType !== undefined) updateData.fuelType = fuelType
    if (customFuelName !== undefined) updateData.customFuelName = customFuelName
    if (address !== undefined) updateData.deliveryAddress = address
    if (scheduledDate !== undefined) updateData.scheduledDate = new Date(scheduledDate)
    if (notes !== undefined) updateData.notes = notes
    if (priority !== undefined) updateData.priority = priority
    if (status !== undefined) updateData.status = status

    // Manejar cambios de cantidad
    if (quantity !== undefined && quantity !== Number(existingDispatch.quantity)) {
      const quantityDifference = Number(quantity) - Number(existingDispatch.quantity)

      // Actualizar la carga del camión
      await prisma.truck.update({
        where: { id: existingDispatch.truckId },
        data: {
          currentLoad: {
            increment: quantityDifference,
          },
        },
      })

      updateData.quantity = Number(quantity)
    }

    // Manejar ubicación
    if (locationGPS) {
      const [lat, lng] = locationGPS.split(",").map((coord: string) => Number.parseFloat(coord.trim()))
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        updateData.deliveryLatitude = lat
        updateData.deliveryLongitude = lng
        updateData.locationMethod = "GPS_AUTO"
      }
    } else if (locationManual) {
      updateData.locationMethod = "GPS_MANUAL"
    }

    // Actualizar el despacho
    const updatedDispatch = await prisma.dispatch.update({
      where: { id: dispatchId },
      data: updateData,
      include: {
        truck: true,
        driver: true,
        customer: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedDispatch,
      message: `Despacho ${updatedDispatch.dispatchNumber} actualizado exitosamente`,
    })
  } catch (error) {
    console.error("Error updating dispatch:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || (payload.role !== "Admin" && payload.role !== "S_A")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const { id } = await params
    const dispatchId = Number.parseInt(id)

    if (Number.isNaN(dispatchId)) {
      return NextResponse.json({ error: "Invalid dispatch ID" }, { status: 400 })
    }

    // Verificar que el despacho existe
    const existingDispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: { truck: true },
    })

    if (!existingDispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
    }

    // Solo permitir eliminación si está en estado BORRADOR o PROGRAMADO
    if (!["BORRADOR", "PROGRAMADO"].includes(existingDispatch.status)) {
      return NextResponse.json({ error: "Cannot delete dispatch in current status" }, { status: 400 })
    }

    // Revertir la carga del camión
    await prisma.truck.update({
      where: { id: existingDispatch.truckId },
      data: {
        currentLoad: {
          decrement: Number(existingDispatch.quantity),
        },
      },
    })

    // Eliminar el despacho
    await prisma.dispatch.delete({
      where: { id: dispatchId },
    })

    return NextResponse.json({
      success: true,
      message: `Despacho ${existingDispatch.dispatchNumber} eliminado exitosamente`,
    })
  } catch (error) {
    console.error("Error deleting dispatch:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
