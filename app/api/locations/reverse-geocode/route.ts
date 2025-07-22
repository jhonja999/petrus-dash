import { type NextRequest, NextResponse } from "next/server"

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude } = body

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Coordenadas requeridas" }, { status: 400 })
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Mapbox token no configurado" }, { status: 500 })
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

    // Geocodificación inversa usando Mapbox
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}&` +
        `country=pe&` +
        `language=es&` +
        `types=address,poi,place`,
    )

    if (!response.ok) {
      throw new Error("Error en la geocodificación inversa de Mapbox")
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontró dirección para estas coordenadas",
        address: null,
      })
    }

    const feature = data.features[0]
    const addressComponents =
      feature.context?.reduce((acc: any, ctx: any) => {
        const [key] = ctx.id.split(".")
        acc[key] = ctx.text
        return acc
      }, {}) || {}

    return NextResponse.json({
      success: true,
      address: feature.place_name,
      addressComponents: {
        text: feature.text,
        road: feature.address,
        houseNumber: addressComponents.address,
        suburb: addressComponents.neighborhood,
        city: addressComponents.place,
        state: addressComponents.region,
        country: addressComponents.country,
        postcode: addressComponents.postcode,
      },
      coordinates: {
        latitude: latitude,
        longitude: longitude,
      },
      properties: feature.properties,
      relevance: feature.relevance,
    })
  } catch (error) {
    console.error("Error in Mapbox reverse geocoding:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get("lat")
    const lon = searchParams.get("lon")

    if (!lat || !lon) {
      return NextResponse.json({ error: "Coordenadas requeridas" }, { status: 400 })
    }

    const latitude = Number.parseFloat(lat)
    const longitude = Number.parseFloat(lon)

    if (!MAPBOX_ACCESS_TOKEN) {
      return NextResponse.json({ error: "Mapbox token no configurado" }, { status: 500 })
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

    // Geocodificación inversa usando Mapbox
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}&` +
        `country=pe&` +
        `language=es&` +
        `types=address,poi,place`,
    )

    if (!response.ok) {
      throw new Error("Error en la geocodificación inversa de Mapbox")
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No se encontró dirección para estas coordenadas",
        address: null,
      })
    }

    const feature = data.features[0]
    const addressComponents =
      feature.context?.reduce((acc: any, ctx: any) => {
        const [key] = ctx.id.split(".")
        acc[key] = ctx.text
        return acc
      }, {}) || {}

    return NextResponse.json({
      success: true,
      name: feature.text,
      address: feature.place_name,
      addressComponents: {
        text: feature.text,
        road: feature.address,
        houseNumber: addressComponents.address,
        suburb: addressComponents.neighborhood,
        city: addressComponents.place,
        state: addressComponents.region,
        country: addressComponents.country,
        postcode: addressComponents.postcode,
      },
      coordinates: {
        latitude: latitude,
        longitude: longitude,
      },
      properties: feature.properties,
      relevance: feature.relevance,
    })
  } catch (error) {
    console.error("Error in Mapbox reverse geocoding:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
