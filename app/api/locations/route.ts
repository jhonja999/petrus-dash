import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

// Endpoint para búsqueda inteligente de ubicaciones
export async function PUT(request: NextRequest) {
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
    const { action, query, coordinates } = body

    if (action === "search") {
      // Búsqueda inteligente usando Nominatim
      if (!query || query.length < 3) {
        return NextResponse.json(
          {
            error: "Query must be at least 3 characters long",
          },
          { status: 400 },
        )
      }

      try {
        const searchQuery = query.includes("Perú") || query.includes("Peru") ? query : `${query}, Perú`

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(searchQuery)}&` +
            `limit=8&` +
            `countrycodes=pe&` +
            `addressdetails=1&` +
            `extratags=1&` +
            `namedetails=1&` +
            `viewbox=-81.33,-18.35,-68.65,-0.012&` +
            `bounded=1`,
          {
            headers: {
              "User-Agent": "PetrusDash/1.0 (Fuel Distribution System)",
            },
          },
        )

        if (response.ok) {
          const data = await response.json()

          // Procesar resultados
          const processedResults = data.map((result: any) => {
            const lat = Number.parseFloat(result.lat)
            const lng = Number.parseFloat(result.lon)

            return {
              ...result,
              distance: calculateDistanceFromLima(lat, lng),
              type: classifyLocationType(result),
              relevanceScore: calculateRelevanceScore(result, lat, lng),
            }
          })

          // Ordenar por relevancia
          processedResults.sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)

          return NextResponse.json({
            success: true,
            data: processedResults,
            query: searchQuery,
          })
        } else {
          throw new Error("Nominatim API error")
        }
      } catch (error) {
        console.error("Search error:", error)
        return NextResponse.json(
          {
            error: "Search service temporarily unavailable",
          },
          { status: 503 },
        )
      }
    }

    if (action === "validate") {
      // Validar coordenadas
      if (!coordinates || !coordinates.latitude || !coordinates.longitude) {
        return NextResponse.json(
          {
            error: "Missing coordinates",
          },
          { status: 400 },
        )
      }

      const { latitude, longitude } = coordinates

      // Validar que esté dentro de Perú
      const isValid = isWithinPeru(latitude, longitude)
      const distanceFromLima = calculateDistanceFromLima(latitude, longitude)

      return NextResponse.json({
        success: true,
        data: {
          isValid,
          withinPeru: isValid,
          distanceFromLima,
          coordinates: { latitude, longitude },
          warnings: generateLocationWarnings(latitude, longitude, distanceFromLima),
        },
      })
    }

    if (action === "geocode") {
      // Geocodificar dirección
      const { address } = body
      if (!address) {
        return NextResponse.json(
          {
            error: "Address is required",
          },
          { status: 400 },
        )
      }

      try {
        const fullAddress = address.includes("Perú") ? address : `${address}, Perú`
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            fullAddress,
          )}&limit=1&countrycodes=pe&addressdetails=1`,
          {
            headers: {
              "User-Agent": "PetrusDash/1.0",
            },
          },
        )

        if (response.ok) {
          const data = await response.json()
          if (data.length > 0) {
            const result = data[0]
            return NextResponse.json({
              success: true,
              data: {
                latitude: Number.parseFloat(result.lat),
                longitude: Number.parseFloat(result.lon),
                address: result.display_name,
                components: result.address,
              },
            })
          } else {
            return NextResponse.json({
              success: false,
              error: "Address not found",
            })
          }
        } else {
          throw new Error("Geocoding service error")
        }
      } catch (error) {
        console.error("Geocoding error:", error)
        return NextResponse.json(
          {
            error: "Geocoding service temporarily unavailable",
          },
          { status: 503 },
        )
      }
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in location API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Funciones auxiliares
function calculateDistanceFromLima(lat: number, lng: number): number {
  const R = 6371 // Radio de la Tierra en km
  const limaLat = -12.0464
  const limaLng = -77.0428
  const dLat = toRadians(lat - limaLat)
  const dLng = toRadians(lng - limaLng)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(limaLat)) * Math.cos(toRadians(lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

function classifyLocationType(result: any): string {
  const name = result.display_name.toLowerCase()
  const type = result.type?.toLowerCase() || ""

  if (name.includes("terminal") || name.includes("puerto") || name.includes("aeropuerto")) return "terminal"
  if (name.includes("grifo") || name.includes("estación") || name.includes("combustible")) return "fuel_station"
  if (name.includes("almacén") || name.includes("depósito")) return "warehouse"
  if (name.includes("fábrica") || name.includes("industria")) return "factory"
  if (name.includes("hospital") || name.includes("clínica")) return "hospital"
  if (name.includes("mina")) return "mine"
  if (name.includes("peaje")) return "toll_booth"
  if (name.includes("aduana")) return "customs"
  if (name.includes("hotel") || name.includes("hospedaje")) return "hotel"
  if (name.includes("restaurante") || name.includes("comida")) return "restaurant"
  if (name.includes("mercado") || name.includes("tienda")) return "market"
  if (name.includes("oficina")) return "office"
  if (name.includes("universidad") || name.includes("colegio") || name.includes("escuela")) return "school"
  if (name.includes("iglesia") || name.includes("templo")) return "church"
  if (name.includes("parque") || name.includes("plaza")) return "park"

  return "other"
}

function isWithinPeru(latitude: number, longitude: number): boolean {
  // Definir límites geográficos de Perú
  const minLat = -18.35
  const maxLat = -0.012
  const minLng = -81.33
  const maxLng = -68.65

  return latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng
}

function calculateRelevanceScore(result: any, lat: number, lng: number): number {
  let score = 0

  // Distancia a Lima (más cerca = más relevante)
  const distance = calculateDistanceFromLima(lat, lng)
  score += 100 / (distance + 1) // Evitar división por cero

  // Importancia del tipo de lugar
  const locationType = classifyLocationType(result)
  switch (locationType) {
    case "terminal":
      score += 50
      break
    case "fuel_station":
      score += 40
      break
    case "warehouse":
      score += 30
      break
    case "factory":
      score += 25
      break
    default:
      score += 10
  }

  // Población (si está disponible)
  if (result.importance) {
    score += result.importance * 50
  }

  // Nombres que coinciden con la búsqueda
  if (result.display_name.toLowerCase().includes(result.query?.toLowerCase())) {
    score += 30
  }

  return score
}

function generateLocationWarnings(latitude: number, longitude: number, distanceFromLima: number): string[] {
  const warnings: string[] = []

  if (distanceFromLima > 800) {
    warnings.push("La ubicación está bastante lejos de Lima.")
  }

  if (!isWithinPeru(latitude, longitude)) {
    warnings.push("La ubicación parece estar fuera de Perú.")
  }

  return warnings
}

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
      driverId,
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

    // Tipo de ubicación: driver_location
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
    const driverId = searchParams.get("driverId")
    const date = searchParams.get("date")
    const limitParam = Number.parseInt(searchParams.get("limit") || "50")

    if (type === "truck_locations" && truckId) {
      const locations = await prisma.truckLocation.findMany({
        where: { truckId: Number.parseInt(truckId) },
        orderBy: { createdAt: "desc" },
        take: limitParam,
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
        take: limitParam,
      })

      return NextResponse.json({
        success: true,
        data: locations,
      })
    }

    if (type === "active_trucks") {
      const trucks = await prisma.truck.findMany({
        where: {
          state: "Activo", // ✅ FIX: Cambié "ACTIVO" por "Activo"
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

    // Obtener ubicación actual del conductor
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

    // Nuevo: Obtener historial de ubicaciones del conductor para cálculos de ruta
    if (type === "driver_route_history" && driverId) {
      let dateFilter = {}
      if (date) {
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)

        dateFilter = {
          lastLocationUpdate: {
            gte: startDate,
            lte: endDate,
          },
        }
      }

      // Obtener historial de ubicaciones del conductor desde las actualizaciones de ubicación
      // Como no tenemos una tabla específica de historial, usaremos las ubicaciones de los camiones asignados
      const driverAssignments = await prisma.assignment.findMany({
        where: {
          driverId: Number.parseInt(driverId),
          createdAt: date
            ? {
                gte: new Date(date),
                lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
              }
            : {
                gte: new Date(new Date().toDateString()), // Hoy
              },
        },
        include: {
          truck: {
            select: {
              id: true,
              placa: true,
            },
          },
        },
      })

      // Obtener ubicaciones de los camiones asignados al conductor
      const truckIds = driverAssignments.map((a) => a.truckId).filter(Boolean)

      let locations: any[] = []
      if (truckIds.length > 0) {
        const truckLocations = await prisma.truckLocation.findMany({
          where: {
            truckId: { in: truckIds },
            createdAt: date
              ? {
                  gte: new Date(date),
                  lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
                }
              : {
                  gte: new Date(new Date().toDateString()),
                },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            latitude: true,
            longitude: true,
            createdAt: true,
            speed: true,
            accuracy: true,
          },
        })

        locations = truckLocations.map((loc) => ({
          id: loc.id,
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.createdAt,
          speed: loc.speed,
          accuracy: loc.accuracy,
        }))
      }

      return NextResponse.json({
        success: true,
        data: locations,
      })
    }

    // Búsqueda en ubicaciones guardadas
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    let frequentLocations = []

    if (query) {
      frequentLocations = (await prisma.$queryRaw`
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
        ${type ? `AND location_type = ${type}` : ""}
        ORDER BY usage_count DESC, last_used DESC
        LIMIT ${limit}
      `) as any[]
    } else {
      // Obtener todas las ubicaciones frecuentes
      frequentLocations = (await prisma.$queryRaw`
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
        ${type ? `WHERE location_type = ${type}` : ""}
        ORDER BY usage_count DESC, last_used DESC
        LIMIT ${limit}
      `) as any[]
    }

    return NextResponse.json({
      success: true,
      data: frequentLocations,
    })
  } catch (error) {
    console.error("Error fetching locations:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
