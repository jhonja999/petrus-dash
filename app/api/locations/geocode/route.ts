import { type NextRequest, NextResponse } from "next/server"

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address) {
      return NextResponse.json({ error: "Dirección requerida" }, { status: 400 })
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Mapbox token no configurado" }, { status: 500 })
    }

    // Agregar "Perú" a la búsqueda si no está incluido
    const searchQuery = address.includes("Perú") || address.includes("Peru") ? address : `${address}, Perú`

    // Usar Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}&` +
        `country=pe&` +
        `limit=5&` +
        `language=es&` +
        `types=address,poi,place`,
      {
        headers: {
          "User-Agent": "PetrusDash/1.0 (Fuel Distribution System)",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Error en la geocodificación de Mapbox")
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontraron coordenadas para esta dirección",
        coordinates: null,
      })
    }

    const results = data.features.map((feature: any) => {
      const [longitude, latitude] = feature.center

      return {
        success: true,
        coordinates: { latitude, longitude },
        formattedAddress: feature.place_name,
        addressComponents: {
          text: feature.text,
          place_name: feature.place_name,
          place_type: feature.place_type?.[0],
          relevance: feature.relevance,
          properties: feature.properties,
          context: feature.context?.reduce((acc: any, ctx: any) => {
            const [key, value] = ctx.id.split(".")
            acc[key] = ctx.text
            return acc
          }, {}),
        },
        confidence: feature.relevance || 0,
        bbox: feature.bbox,
      }
    })

    // Validar que esté en Perú (las coordenadas ya están filtradas por country=pe)
    const validResults = results.filter((result: any) => {
      const { latitude, longitude } = result.coordinates
      const peruBounds = {
        north: -0.012,
        south: -18.35,
        east: -68.65,
        west: -81.33,
      }

      return (
        latitude >= peruBounds.south &&
        latitude <= peruBounds.north &&
        longitude >= peruBounds.west &&
        longitude <= peruBounds.east
      )
    })

    if (validResults.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Las coordenadas encontradas están fuera de Perú",
        coordinates: null,
      })
    }

    return NextResponse.json({
      success: true,
      results: validResults,
      query: searchQuery,
    })
  } catch (error) {
    console.error("Error in Mapbox geocoding:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Dirección requerida" }, { status: 400 })
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Mapbox token no configurado" }, { status: 500 })
    }

    // Agregar "Perú" a la búsqueda si no está incluido
    const searchQuery = address.includes("Perú") || address.includes("Peru") ? address : `${address}, Perú`

    // Usar Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}&` +
        `country=pe&` +
        `limit=8&` +
        `language=es&` +
        `types=address,poi,place`,
    )

    if (!response.ok) {
      throw new Error("Error en la geocodificación de Mapbox")
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json([])
    }

    const results = data.features.map((feature: any) => {
      const [longitude, latitude] = feature.center

      return {
        place_id: feature.id,
        display_name: feature.place_name,
        lat: latitude.toString(),
        lon: longitude.toString(),
        type: feature.place_type?.[0] || "address",
        importance: feature.relevance || 0,
        address: {
          road: feature.address,
          suburb: feature.context?.find((c: any) => c.id.includes("neighborhood"))?.text,
          city: feature.context?.find((c: any) => c.id.includes("place"))?.text,
          state: feature.context?.find((c: any) => c.id.includes("region"))?.text,
          country: feature.context?.find((c: any) => c.id.includes("country"))?.text,
          postcode: feature.context?.find((c: any) => c.id.includes("postcode"))?.text,
        },
        properties: feature.properties,
        bbox: feature.bbox,
      }
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error in Mapbox geocoding:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
