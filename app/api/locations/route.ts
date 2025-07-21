import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

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
    const {
      type,
      truckId,
      dispatchId,
      driverId, // Nuevo campo para driverId
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      altitude,
      batteryLevel,
      isMoving,
    } = body

    // Validar datos requeridos
    if (!type || !latitude || !longitude) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (type === "truck_location" && truckId) {
      // Verificar que el camión existe
      const truck = await prisma.truck.findUnique({
        where: { id: truckId },
        select: {
          id: true,
          placa: true,
          currentLatitude: true,
          currentLongitude: true,
        },
      })

      if (!truck) {
        return NextResponse.json({ error: "Truck not found" }, { status: 404 })
      }

      // Crear registro de ubicación del camión
      const truckLocation = await prisma.truckLocation.create({
        data: {
          truckId,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          altitude,
          batteryLevel,
          isMoving: isMoving || false,
        },
      })

      // Actualizar ubicación actual del camión
      await prisma.truck.update({
        where: { id: truckId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        data: truckLocation,
        message: "Truck location updated successfully",
      })
    }

    if (type === "dispatch_location" && dispatchId) {
      // Verificar que el despacho existe
      const dispatch = await prisma.dispatch.findUnique({
        where: { id: dispatchId },
        select: {
          id: true,
          dispatchNumber: true,
          status: true,
        },
      })

      if (!dispatch) {
        return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
      }

      // Crear registro de ubicación del despacho
      const dispatchLocation = await prisma.dispatchLocation.create({
        data: {
          dispatchId,
          latitude,
          longitude,
          accuracy,
          speed,
          heading,
          altitude,
          captureMethod: "GPS_AUTO",
        },
      })

      return NextResponse.json({
        success: true,
        data: dispatchLocation,
        message: "Dispatch location recorded successfully",
      })
    }

    // Nuevo tipo de ubicación: driver_location
    if (type === "driver_location" && driverId) {
      // Verificar que el conductor existe
      const driver = await prisma.user.findUnique({
        where: { id: driverId },
        select: {
          id: true,
          name: true,
          lastname: true,
          currentLatitude: true,
          currentLongitude: true,
        },
      })

      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      }

      // Actualizar ubicación actual del conductor
      await prisma.user.update({
        where: { id: driverId },
        data: {
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        data: { driverId, latitude, longitude },
        message: "Driver location updated successfully",
      })
    }

    // Tipo de ubicación no válido
    return NextResponse.json({ error: "Invalid location type" }, { status: 400 })
  } catch (error) {
    console.error("Error processing location:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const truckId = searchParams.get("truckId")
    const dispatchId = searchParams.get("dispatchId")
    const driverId = searchParams.get("driverId") // Nuevo campo para driverId
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (type === "truck_locations" && truckId) {
      const locations = await prisma.truckLocation.findMany({
        where: { truckId: Number.parseInt(truckId) },
        orderBy: { createdAt: "desc" },
        take: limit,
      })

      return NextResponse.json({
        success: true,
        data: locations,
      })
    }

    if (type === "dispatch_locations" && dispatchId) {
      const locations = await prisma.dispatchLocation.findMany({
        where: { dispatchId: Number.parseInt(dispatchId) },
        orderBy: { createdAt: "desc" },
        take: limit,
      })

      return NextResponse.json({
        success: true,
        data: locations,
      })
    }

    if (type === "active_trucks") {
      const trucks = await prisma.truck.findMany({
        where: {
          state: "ACTIVO",
          currentLatitude: { not: null },
          currentLongitude: { not: null },
        },
        select: {
          id: true,
          placa: true,
          currentLatitude: true,
          currentLongitude: true,
          lastLocationUpdate: true,
          state: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: trucks,
      })
    }

    // Nuevo tipo de GET: driver_location
    if (type === "driver_location" && driverId) {
      const driver = await prisma.user.findUnique({
        where: { id: Number.parseInt(driverId) },
        select: {
          id: true,
          name: true,
          lastname: true,
          currentLatitude: true,
          currentLongitude: true,
          lastLocationUpdate: true,
        },
      })

      if (!driver) {
        return NextResponse.json({ error: "Driver not found" }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: driver,
      })
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
