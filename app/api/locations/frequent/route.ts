import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    // Obtener ubicaciones frecuentes usando Prisma ORM
    const frequentLocations = await prisma.frequentLocation.findMany({
      where: {
        createdBy: payload.id,
      },
      orderBy: [{ usageCount: "desc" }, { lastUsed: "desc" }],
      take: 20,
      select: {
        id: true,
        address: true,
        latitude: true,
        longitude: true,
        district: true,
        province: true,
        department: true,
        locationType: true,
        usageCount: true,
        lastUsed: true,
        contactName: true,
        contactPhone: true,
        accessInstructions: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: frequentLocations,
    })
  } catch (error) {
    console.error("Error fetching frequent locations:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const body = await request.json()
    const {
      address,
      latitude,
      longitude,
      district,
      province,
      department,
      locationType,
      contactName,
      contactPhone,
      accessInstructions,
    } = body

    // Validar campos requeridos
    if (!address || !latitude || !longitude) {
      return NextResponse.json({ error: "Dirección y coordenadas son requeridas" }, { status: 400 })
    }

    // Validar que las coordenadas estén en Perú
    const peruBounds = {
      north: -0.012,
      south: -18.35,
      east: -68.65,
      west: -81.33,
    }

    if (
      latitude < peruBounds.south ||
      latitude > peruBounds.north ||
      longitude < peruBounds.west ||
      longitude > peruBounds.east
    ) {
      return NextResponse.json({ error: "Las coordenadas deben estar dentro de Perú" }, { status: 400 })
    }

    // Verificar si la ubicación ya existe (usando Prisma)
    const existingLocation = await prisma.frequentLocation.findFirst({
      where: {
        createdBy: payload.id,
        latitude: {
          gte: latitude - 0.001,
          lte: latitude + 0.001,
        },
        longitude: {
          gte: longitude - 0.001,
          lte: longitude + 0.001,
        },
      },
    })

    if (existingLocation) {
      // Actualizar contador de uso
      const updatedLocation = await prisma.frequentLocation.update({
        where: { id: existingLocation.id },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: "Ubicación actualizada",
        data: updatedLocation,
      })
    }

    // Crear nueva ubicación frecuente
    const newLocation = await prisma.frequentLocation.create({
      data: {
        address,
        latitude,
        longitude,
        district: district || "",
        province: province || "",
        department: department || "Lima",
        locationType: locationType || "descarga",
        contactName: contactName || "",
        contactPhone: contactPhone || "",
        accessInstructions: accessInstructions || "",
        usageCount: 1,
        createdBy: payload.id,
        lastUsed: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: "Ubicación frecuente guardada",
      data: newLocation,
    })
  } catch (error) {
    console.error("Error saving frequent location:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
