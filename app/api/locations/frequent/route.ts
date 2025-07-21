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

    // Obtener ubicaciones frecuentes ordenadas por uso
    const frequentLocations = await prisma.$queryRaw`
      SELECT 
        id,
        address,
        latitude,
        longitude,
        district,
        province,
        department,
        location_type as locationType,
        usage_count as usageCount,
        last_used as lastUsed,
        contact_name as contactName,
        contact_phone as contactPhone,
        access_instructions as accessInstructions
      FROM frequent_locations 
      WHERE created_by = ${payload.id}
      ORDER BY usage_count DESC, last_used DESC
      LIMIT 20
    `

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

    // Verificar si la ubicación ya existe
    const existingLocation = await prisma.$queryRaw`
      SELECT id FROM frequent_locations 
      WHERE created_by = ${payload.id}
      AND ABS(latitude - ${latitude}) < 0.001 
      AND ABS(longitude - ${longitude}) < 0.001
    `

    if (Array.isArray(existingLocation) && existingLocation.length > 0) {
      // Actualizar contador de uso
      await prisma.$executeRaw`
        UPDATE frequent_locations 
        SET usage_count = usage_count + 1, last_used = NOW()
        WHERE id = ${(existingLocation[0] as any).id}
      `

      return NextResponse.json({
        success: true,
        message: "Ubicación actualizada",
        data: existingLocation[0],
      })
    }

    // Crear nueva ubicación frecuente
    const newLocation = await prisma.$queryRaw`
      INSERT INTO frequent_locations (
        address, latitude, longitude, district, province, department,
        location_type, contact_name, contact_phone, access_instructions,
        usage_count, created_by, last_used, created_at, updated_at
      ) VALUES (
        ${address}, ${latitude}, ${longitude}, ${district || ""}, 
        ${province || ""}, ${department || "Lima"}, ${locationType || "descarga"},
        ${contactName || ""}, ${contactPhone || ""}, ${accessInstructions || ""},
        1, ${payload.id}, NOW(), NOW(), NOW()
      )
      RETURNING *
    `

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
