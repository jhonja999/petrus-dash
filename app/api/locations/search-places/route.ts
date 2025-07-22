import { type NextRequest, NextResponse } from "next/server"

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const category = searchParams.get("category") // gasolinera, hospital, etc.
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")
    const radius = searchParams.get("radius") || "50000" // 50km por defecto

    if (!query && !category) {
      return NextResponse.json({ error: "Query o categoría requerida" }, { status: 400 })
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      console.warn("Mapbox token not configured for search-places API. Returning empty results.")
      return NextResponse.json({ success: true, data: [], message: "Mapbox token no configurado" })
    }

    let searchQuery = query || ""
    const types = "poi"

    // Mapear categorías a términos de búsqueda específicos
    if (category) {
      const categoryMap: Record<string, string> = {
        gasolinera: "gasolinera estación combustible",
        grifo: "grifo estación servicio",
        hospital: "hospital clínica centro médico",
        banco: "banco cajero automático",
        restaurante: "restaurante comida",
        hotel: "hotel hospedaje",
        farmacia: "farmacia botica",
        mercado: "mercado supermercado tienda",
        terminal: "terminal transporte",
        puerto: "puerto muelle",
        aeropuerto: "aeropuerto",
        universidad: "universidad instituto educación",
        iglesia: "iglesia templo",
        parque: "parque plaza",
        oficina: "oficina empresa",
      }

      searchQuery = categoryMap[category] || category
    }

    // Construir URL de búsqueda
    let url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
      `access_token=${MAPBOX_ACCESS_TOKEN}&` +
      `country=pe&` +
      `limit=20&` +
      `language=es&` +
      `types=${types}`

    // Si tenemos coordenadas, buscar cerca de esa ubicación
    if (lat && lng) {
      url += `&proximity=${lng},${lat}`
    } else {
      // Por defecto buscar cerca de Lima
      url += `&proximity=-77.0428,-12.0464`
    }

    const response = await fetch(url)

    if (!response.ok) {
      // Log the error but return a graceful response to the client
      const errorText = await response.text()
      console.error(`Mapbox API error for search-places (status: ${response.status}): ${errorText}`)
      return NextResponse.json(
        { success: false, data: [], message: "Error en la búsqueda de lugares externos" },
        { status: 200 },
      ) // Return 200 with error message
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: "No se encontraron lugares",
      })
    }

    const results = data.features.map((feature: any) => {
      const [longitude, latitude] = feature.center

      // Calcular distancia si tenemos coordenadas de referencia
      let distance = null
      if (lat && lng) {
        distance = calculateDistance(Number.parseFloat(lat), Number.parseFloat(lng), latitude, longitude)
      }

      return {
        id: feature.id,
        name: feature.text,
        address: feature.place_name,
        latitude,
        longitude,
        category: feature.properties?.category || classifyPlace(feature),
        type: feature.place_type?.[0] || "poi",
        relevance: feature.relevance || 0,
        distance: distance ? Math.round(distance * 1000) : null, // en metros
        properties: {
          ...feature.properties,
          phone: feature.properties?.tel || feature.properties?.phone,
          website: feature.properties?.website,
          address_components: feature.context?.reduce((acc: any, ctx: any) => {
            const [key] = ctx.id.split(".")
            acc[key] = ctx.text
            return acc
          }, {}),
        },
        bbox: feature.bbox,
      }
    })

    // Ordenar por relevancia y distancia
    results.sort((a: any, b: any) => {
      if (a.distance && b.distance) {
        return a.distance - b.distance
      }
      return b.relevance - a.relevance
    })

    return NextResponse.json({
      success: true,
      data: results,
      query: searchQuery,
      total: results.length,
    })
  } catch (error) {
    console.error("Error in places search:", error)
    return NextResponse.json(
      { success: false, data: [], error: "Error interno del servidor al buscar lugares" },
      { status: 200 },
    ) // Return 200 with error message
  }
}

// Función para calcular distancia entre dos puntos
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Radio de la Tierra en km
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Clasificar lugares basado en el nombre y propiedades
function classifyPlace(feature: any): string {
  const name = (feature.text || "").toLowerCase()
  const placeName = (feature.place_name || "").toLowerCase()
  const properties = feature.properties || {}

  if (
    name.includes("gasolinera") ||
    name.includes("grifo") ||
    name.includes("petro") ||
    placeName.includes("combustible") ||
    placeName.includes("estación")
  ) {
    return "gasolinera"
  }

  if (name.includes("hospital") || name.includes("clínica") || name.includes("centro médico")) {
    return "hospital"
  }

  if (name.includes("banco") || name.includes("cajero")) {
    return "banco"
  }

  if (name.includes("restaurante") || name.includes("comida") || name.includes("restaurant")) {
    return "restaurante"
  }

  if (name.includes("hotel") || name.includes("hospedaje")) {
    return "hotel"
  }

  if (name.includes("farmacia") || name.includes("botica")) {
    return "farmacia"
  }

  if (name.includes("mercado") || name.includes("supermercado") || name.includes("tienda")) {
    return "mercado"
  }

  if (name.includes("terminal") || name.includes("transporte")) {
    return "terminal"
  }

  if (name.includes("puerto") || name.includes("muelle")) {
    return "puerto"
  }

  if (name.includes("aeropuerto")) {
    return "aeropuerto"
  }

  return "general"
}
