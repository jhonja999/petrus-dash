// Configuración específica para Perú
export const PERU_BOUNDS = {
  north: -0.012,
  south: -18.35,
  east: -68.65,
  west: -81.33,
}

// Función para validar si una coordenada está dentro de Perú
export function isWithinPeru(latitude: number, longitude: number): boolean {
  return (
    latitude >= PERU_BOUNDS.south &&
    latitude <= PERU_BOUNDS.north &&
    longitude >= PERU_BOUNDS.west &&
    longitude <= PERU_BOUNDS.east
  )
}

// Ciudades principales de Perú
export const PERU_CITIES = {
  lima: { lat: -12.0464, lng: -77.0428, name: "Lima" },
  cajamarca: { lat: -7.1619, lng: -78.5151, name: "Cajamarca" },
  arequipa: { lat: -16.409, lng: -71.5375, name: "Arequipa" },
  trujillo: { lat: -8.1116, lng: -79.0287, name: "Trujillo" },
  chiclayo: { lat: -6.7714, lng: -79.837, name: "Chiclayo" },
  piura: { lat: -5.1945, lng: -80.6328, name: "Piura" },
  iquitos: { lat: -3.7437, lng: -73.2516, name: "Iquitos" },
  cusco: { lat: -13.5319, lng: -71.9675, name: "Cusco" },
  huancayo: { lat: -12.0653, lng: -75.2049, name: "Huancayo" },
  pucallpa: { lat: -8.3791, lng: -74.5539, name: "Pucallpa" },
}

// Departamentos de Perú
export const PERU_DEPARTMENTS = [
  "Lima",
  "Cajamarca",
  "La Libertad",
  "Ancash",
  "Huánuco",
  "Pasco",
  "Junín",
  "Huancavelica",
  "Ayacucho",
  "Apurímac",
  "Cusco",
  "Arequipa",
  "Moquegua",
  "Tacna",
  "Puno",
  "Madre de Dios",
  "Ucayali",
  "Loreto",
  "San Martín",
  "Amazonas",
  "Piura",
  "Lambayeque",
  "Tumbes",
  "Ica",
]

// Función para calcular distancia entre dos puntos (fórmula de Haversine)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radio de la Tierra en kilómetros
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

// Función para obtener la ciudad más cercana
export function getNearestCity(latitude: number, longitude: number): { name: string; distance: number } | null {
  if (!isWithinPeru(latitude, longitude)) {
    return null
  }

  let nearestCity = null
  let minDistance = Number.POSITIVE_INFINITY

  for (const [key, city] of Object.entries(PERU_CITIES)) {
    const distance = calculateDistance(latitude, longitude, city.lat, city.lng)
    if (distance < minDistance) {
      minDistance = distance
      nearestCity = { name: city.name, distance }
    }
  }

  return nearestCity
}

// Función para validar coordenadas
export function validateCoordinates(
  latitude: number,
  longitude: number,
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (isNaN(latitude) || isNaN(longitude)) {
    errors.push("Las coordenadas deben ser números válidos")
  }

  if (latitude < -90 || latitude > 90) {
    errors.push("La latitud debe estar entre -90 y 90 grados")
  }

  if (longitude < -180 || longitude > 180) {
    errors.push("La longitud debe estar entre -180 y 180 grados")
  }

  if (!isWithinPeru(latitude, longitude)) {
    errors.push("Las coordenadas deben estar dentro del territorio peruano")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}
