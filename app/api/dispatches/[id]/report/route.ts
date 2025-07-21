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

    // Obtener el despacho con todas las relaciones necesarias
    const dispatch = await prisma.dispatch.findUnique({
      where: { id: dispatchId },
      include: {
        truck: true,
        driver: true,
        customer: true,
        locations: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 })
    }

    // Obtener puntos de descarga simulados (en el futuro vendrán de la base de datos)
    const dischargePoints = [
      {
        id: 1,
        location: dispatch.deliveryAddress,
        latitude: dispatch.deliveryLatitude,
        longitude: dispatch.deliveryLongitude,
        quantity: Number(dispatch.quantity),
        startTime: dispatch.startedAt || dispatch.scheduledDate,
        endTime: dispatch.completedAt,
        initialKm: 0,
        finalKm: 0,
        status: dispatch.status,
        notes: dispatch.notes,
      },
    ]

    // Obtener fotos simuladas (en el futuro vendrán de la base de datos)
    const photos = [
      {
        id: 1,
        url: "/placeholder.svg?height=200&width=300&text=Carga+Inicial",
        description: "Foto de carga inicial",
        timestamp: dispatch.startedAt || dispatch.createdAt,
        location: "Terminal de carga",
        type: "loading" as const,
      },
      {
        id: 2,
        url: "/placeholder.svg?height=200&width=300&text=Entrega+Final",
        description: "Foto de entrega final",
        timestamp: dispatch.completedAt || dispatch.createdAt,
        location: dispatch.deliveryAddress,
        type: "delivery" as const,
      },
    ]

    // Obtener firmas simuladas (en el futuro vendrán de la base de datos)
    const signatures = [
      {
        id: 1,
        type: "driver" as const,
        signatureUrl: "/placeholder.svg?height=100&width=200&text=Firma+Conductor",
        signerName: `${dispatch.driver.name} ${dispatch.driver.lastname}`,
        signerDni: dispatch.driver.dni,
        timestamp: dispatch.startedAt || dispatch.createdAt,
        ipAddress: "192.168.1.100",
      },
    ]

    const reportData = {
      ...dispatch,
      dischargePoints,
      photos,
      signatures,
    }

    return NextResponse.json({
      success: true,
      data: reportData,
    })
  } catch (error) {
    console.error("Error fetching dispatch report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
