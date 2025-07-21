import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address } = body

    if (!address) {
      return NextResponse.json({ error: "Dirección requerida" }, { status: 400 })
    }

    // Agregar "Perú" a la búsqueda si no está incluido
    const searchQuery = address.includes("Perú") || address.includes("Peru") ? address : `${address}, Perú`

    // Geocodificar usando Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?` +
        `format=json&` +
        `q=${encodeURIComponent(searchQuery)}&` +
        `limit=1&` +
        `countrycodes=pe&` +
        `addressdetails=1`,
      {
        headers: {
          "User-Agent": "PetrusDash/1.0 (Fuel Distribution System)",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Error en la geocodificación")
    }

    const data = await response.json()

    if (data.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontraron coordenadas para esta dirección",
        coordinates: null,
      })
    }

    const result = data[0]
    const coordinates = {
      latitude: Number.parseFloat(result.lat),
      longitude: Number.parseFloat(result.lon),
    }

    // Validar que esté en Perú
    const peruBounds = {
      north: -0.012,
      south: -18.35,
      east: -68.65,
      west: -81.33,
    }

    const isInPeru =
      coordinates.latitude >= peruBounds.south &&
      coordinates.latitude <= peruBounds.north &&
      coordinates.longitude >= peruBounds.west &&
      coordinates.longitude <= peruBounds.east

    if (!isInPeru) {
      return NextResponse.json({
        success: false,
        error: "Las coordenadas encontradas están fuera de Perú",
        coordinates: null,
      })
    }

    return NextResponse.json({
      success: true,
      coordinates,
      formattedAddress: result.display_name,
      addressComponents: {
        road: result.address?.road,
        suburb: result.address?.suburb,
        city: result.address?.city || result.address?.town,
        state: result.address?.state,
        country: result.address?.country,
        postcode: result.address?.postcode,
      },
      confidence: result.importance || 0,
    })
  } catch (error) {
    console.error("Error in geocoding:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
