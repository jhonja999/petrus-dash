import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest, { params }: { params: { driverId: string } }) {
  try {
    const driverId = Number.parseInt(params.driverId)
    const { latitude, longitude, timestamp } = await request.json()

    if (isNaN(driverId)) {
      return NextResponse.json({ error: "ID de conductor inválido" }, { status: 400 })
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Latitud y longitud son requeridas" }, { status: 400 })
    }

    // Verificar que el conductor existe
    const driver = await prisma.user.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      return NextResponse.json({ error: "Conductor no encontrado" }, { status: 404 })
    }

    // Por ahora, solo loggeamos la ubicación
    // En el futuro se puede guardar en una tabla de tracking
    console.log(`📍 Location update for driver ${driverId}:`, {
      latitude,
      longitude,
      timestamp,
      driver: `${driver.name} ${driver.lastname}`,
    })

    // Aquí podrías guardar en una tabla de tracking si la creas
    // await prisma.driverLocation.create({
    //   data: {
    //     driverId,
    //     latitude,
    //     longitude,
    //     timestamp: new Date(timestamp)
    //   }
    // })

    return NextResponse.json({
      success: true,
      message: "Ubicación actualizada correctamente",
    })
  } catch (error) {
    console.error("Error updating driver location:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
