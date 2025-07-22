import { type NextRequest, NextResponse } from "next/server"

const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

// Known cities in Peru for quick lookup
const KNOWN_PERU_CITIES: { [key: string]: { lat: number; lng: number; address: string }[] } = {
  lima: [
    { lat: -12.0464, lng: -77.0428, address: "Lima, Perú" },
    { lat: -12.0917, lng: -77.0282, address: "San Isidro, Lima, Perú" },
    { lat: -12.12, lng: -77.031, address: "Miraflores, Lima, Perú" },
  ],
  cajamarca: [{ lat: -7.1619, lng: -78.5151, address: "Cajamarca, Perú" }],
  arequipa: [{ lat: -16.409, lng: -71.5375, address: "Arequipa, Perú" }],
  trujillo: [{ lat: -8.1159, lng: -79.0299, address: "Trujillo, Perú" }],
  cusco: [{ lat: -13.532, lng: -71.9675, address: "Cusco, Perú" }],
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
  }

  console.log("Geocoding request:", address)

  // 1. Strategy: Known Cities (instantaneous)
  const lowerCaseAddress = address.toLowerCase()
  for (const city in KNOWN_PERU_CITIES) {
    if (lowerCaseAddress.includes(city)) {
      const results = KNOWN_PERU_CITIES[city].filter((loc) => loc.address.toLowerCase().includes(lowerCaseAddress))
      if (results.length > 0) {
        console.log(`Found ${results.length} results from known cities.`)
        return NextResponse.json(
          results.map((r) => ({
            display_name: r.address,
            lat: r.lat.toString(),
            lon: r.lng.toString(),
            type: "city",
            importance: 1.0,
          })),
        )
      }
    }
  }

  // 2. Strategy: Mapbox API (if token configured)
  if (MAPBOX_ACCESS_TOKEN) {
    try {
      const mapboxUrl =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
        `access_token=${MAPBOX_ACCESS_TOKEN}&` +
        `country=pe&` +
        `limit=5&` +
        `language=es`

      const mapboxResponse = await fetch(mapboxUrl)
      const mapboxData = await mapboxResponse.json()

      if (mapboxResponse.ok && mapboxData.features && mapboxData.features.length > 0) {
        const results = mapboxData.features.map((feature: any) => ({
          display_name: feature.place_name,
          lat: feature.center[1].toString(),
          lon: feature.center[0].toString(),
          type: feature.place_type?.[0] || "address",
          importance: feature.relevance || 0.5,
          address: feature.properties?.address, // Mapbox specific address components
        }))
        console.log(`Found ${results.length} results from Mapbox.`)
        return NextResponse.json(results)
      } else {
        console.warn("Mapbox geocoding failed or returned no results:", mapboxData.message || "No features found")
      }
    } catch (mapboxError) {
      console.error("Error with Mapbox geocoding:", mapboxError)
    }
  } else {
    console.warn("MAPBOX_ACCESS_TOKEN is not configured. Skipping Mapbox geocoding.")
  }

  // 3. Strategy: Nominatim/OpenStreetMap (fallback)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=5&countrycodes=pe&addressdetails=1`

    const nominatimResponse = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "PetrusDash/1.0 (contact@example.com)", // Required by Nominatim
      },
    })
    const nominatimData = await nominatimResponse.json()

    if (nominatimResponse.ok && nominatimData && nominatimData.length > 0) {
      const results = nominatimData.map((item: any) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
        type: item.type,
        importance: item.importance || 0.1,
        address: item.address, // Nominatim specific address components
      }))
      console.log(`Found ${results.length} results from Nominatim.`)
      return NextResponse.json(results)
    } else {
      console.warn("Nominatim geocoding failed or returned no results.")
    }
  } catch (nominatimError) {
    console.error("Error with Nominatim geocoding:", nominatimError)
  }

  // 4. Fallback: Return empty array if no results found from any strategy
  console.log("No geocoding results found for:", address)
  return NextResponse.json([])
}
