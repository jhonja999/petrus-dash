import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude, address } = body

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
        valid: false,
      })
    }

    // Calcular distancia desde Lima
    const limaLat = -12.0464
    const limaLng = -77.0428
    const R = 6371 // Radio de la Tierra en km

    const dLat = toRadians(latitude - limaLat)
    const dLng = toRadians(longitude - limaLng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(limaLat)) * Math.cos(toRadians(latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    // Validar distancia máxima (1000 km)
    if (distance > 1000) {
      return NextResponse.json({
        success: false,
        error: "La ubicación está muy lejos de Lima (>1000km)",
        valid: false,
        distance: Math.round(distance),
      })
    }

    // Validar formato de dirección peruana si se proporciona
    const addressValid = true
    const addressWarnings = []

    if (address) {
      const peruPrefixes = ["Jr.", "Av.", "Cal.", "Psj.", "Prol.", "Urb.", "Mz.", "Lt."]
      const hasValidPrefix = peruPrefixes.some((prefix) => address.toLowerCase().includes(prefix.toLowerCase()))

      if (!hasValidPrefix) {
        addressWarnings.push("La dirección no tiene un prefijo típico peruano")
      }

      if (!address.toLowerCase().includes("perú") && !address.toLowerCase().includes("peru")) {
        addressWarnings.push("Se recomienda incluir 'Perú' en la dirección")
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      inPeru: isInPeru,
      distanceFromLima: Math.round(distance),
      estimatedTravelTime: Math.round(distance / 60), // Estimación simple: 60 km/h promedio
      addressValid,
      addressWarnings,
      coordinates: {
        latitude,
        longitude,
      },
    })
  } catch (error) {
    console.error("Error validating location:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}
