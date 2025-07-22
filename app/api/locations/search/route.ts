import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

interface SearchResult {
  id: string
  type: "saved" | "geocoded" | "frequent"
  name: string
  address: string
  latitude?: number
  longitude?: number
  confidence?: number
  usageCount?: number
  lastUsed?: Date
  source?: string
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
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const includeGeocoding = searchParams.get("geocoding") === "true"

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Query debe tener al menos 2 caracteres",
        },
        { status: 400 },
      )
    }

    const results: SearchResult[] = []

    // 1. Buscar en ubicaciones frecuentes
    try {
      const frequentLocations = (await prisma.$queryRaw`
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
          last_used as lastUsed
        FROM frequent_locations 
        WHERE (
          LOWER(address) LIKE LOWER(${`%${query}%`}) OR
          LOWER(district) LIKE LOWER(${`%${query}%`}) OR
          LOWER(province) LIKE LOWER(${`%${query}%`})
        )
        ORDER BY usage_count DESC, last_used DESC
        LIMIT ${Math.min(limit, 5)}
      `) as any[]

      for (const location of frequentLocations) {
        results.push({
          id: `frequent_${location.id}`,
          type: "frequent",
          name: location.address.split(",")[0],
          address: location.address,
          latitude: Number.parseFloat(location.latitude),
          longitude: Number.parseFloat(location.longitude),
          usageCount: location.usageCount,
          lastUsed: location.lastUsed,
        })
      }
    } catch (error) {
      console.warn("Error searching frequent locations:", error)
    }

    // 2. Buscar en ubicaciones guardadas (si las hay)
    try {
      const savedLocations = (await prisma.$queryRaw`
        SELECT DISTINCT
          address,
          "currentLatitude" as latitude,
          "currentLongitude" as longitude
        FROM users 
        WHERE 
          "currentLatitude" IS NOT NULL 
          AND "currentLongitude" IS NOT NULL
          AND LOWER(address) LIKE LOWER(${`%${query}%`})
        LIMIT 3
      `) as any[]

      for (const location of savedLocations) {
        if (location.address && location.latitude && location.longitude) {
          results.push({
            id: `saved_${location.address}`,
            type: "saved",
            name: location.address.split(",")[0],
            address: location.address,
            latitude: Number.parseFloat(location.latitude),
            longitude: Number.parseFloat(location.longitude),
          })
        }
      }
    } catch (error) {
      console.warn("Error searching saved locations:", error)
    }

    // 3. Geocodificación en tiempo real (si se solicita y no hay suficientes resultados)
    if (includeGeocoding && results.length < 3) {
      try {
        const geocodeResponse = await fetch(
          `${request.nextUrl.origin}/api/locations/geocode?address=${encodeURIComponent(query)}`,
        )

        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json()

          if (geocodeData.success && geocodeData.results) {
            for (const result of geocodeData.results.slice(0, 5)) {
              results.push({
                id: `geocoded_${result.latitude}_${result.longitude}`,
                type: "geocoded",
                name: result.formattedAddress.split(",")[0],
                address: result.formattedAddress,
                latitude: result.latitude,
                longitude: result.longitude,
                confidence: result.confidence,
                source: result.source,
              })
            }
          }
        }
      } catch (error) {
        console.warn("Error in real-time geocoding:", error)
      }
    }

    // Ordenar resultados por relevancia
    const sortedResults = results
      .sort((a, b) => {
        // Priorizar ubicaciones frecuentes
        if (a.type === "frequent" && b.type !== "frequent") return -1
        if (b.type === "frequent" && a.type !== "frequent") return 1

        // Luego por uso frecuente
        if (a.usageCount && b.usageCount) {
          return b.usageCount - a.usageCount
        }

        // Luego por confianza de geocodificación
        if (a.confidence && b.confidence) {
          return b.confidence - a.confidence
        }

        return 0
      })
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      results: sortedResults,
      query,
      totalFound: sortedResults.length,
      hasMore: results.length > limit,
    })
  } catch (error) {
    console.error("Error in location search:", error)
    return NextResponse.json(
      {
        error: "Error interno del servidor",
      },
      { status: 500 },
    )
  }
}
