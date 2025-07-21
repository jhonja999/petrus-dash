import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Coordenadas requeridas" }, { status: 400 })
    }

    // Validar que las coordenadas estén en Perú
    const peruBounds = {
      north: -0.012,
      south: -18.35,
      east: -68.65,
      west: -81.33,
    }

    const isInPeru =
      latitude >= peruBounds.south &&
      latitude <= peruBounds.north &&
      longitude >= peruBounds.west &&
      longitude <= peruBounds.east

    if (!isInPeru) {
      return NextResponse.json({
        success: false,
        error: "Las coordenadas están fuera de Perú",
        address: null,
      })
    }

    // Geocodificación inversa usando Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&` +
        `lat=${latitude}&` +
        `lon=${longitude}&` +
        `zoom=18&` +
        `addressdetails=1`,
      {
        headers: {
          "User-Agent": "PetrusDash/1.0 (Fuel Distribution System)",
        },
      },
    )

    if (!response.ok) {
      throw new Error("Error en la geocodificación inversa")
    }

    const data = await response.json()

    if (!data.display_name) {
      return NextResponse.json({
        success: false,
        error: "No se encontró dirección para estas coordenadas",
        address: null,
      })
    }

    return NextResponse.json({
      success: true,
      address: data.display_name,
      addressComponents: {
        road: data.address?.road,
        houseNumber: data.address?.house_number,
        suburb: data.address?.suburb,
        city: data.address?.city || data.address?.town,
        state: data.address?.state,
        country: data.address?.country,
        postcode: data.address?.postcode,
      },
      coordinates: {
        latitude: Number.parseFloat(data.lat),
        longitude: Number.parseFloat(data.lon),
      },
    })
  } catch (error) {
    console.error("Error in reverse geocoding:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
