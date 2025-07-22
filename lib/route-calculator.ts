import { calculateDistance } from "./map-utils"

// Configuración para cálculos de ruta
export const ROUTE_CONFIG = {
  // Velocidades promedio por tipo de zona (km/h)
  AVERAGE_SPEEDS: {
    urban: 25, // Zona urbana
    highway: 80, // Carretera
    rural: 45, // Zona rural
    industrial: 30, // Zona industrial
  },

  // Consumo promedio de combustible por tipo de camión (L/100km)
  FUEL_CONSUMPTION: {
    small: 25, // Camiones pequeños (hasta 3000 gal)
    medium: 35, // Camiones medianos (3001-7500 gal)
    large: 45, // Camiones grandes (7501+ gal)
  },

  // Factor de corrección por carga (multiplicador)
  LOAD_FACTOR: {
    empty: 0.85, // Camión vacío
    partial: 1.0, // Carga parcial
    full: 1.15, // Carga completa
  },

  // Puntos de carga principales en Perú
  LOADING_POINTS: {
    lima: { lat: -12.0464, lng: -77.0428, name: "Terminal Lima" },
    callao: { lat: -12.0566, lng: -77.1181, name: "Puerto del Callao" },
    cajamarca: { lat: -7.1619, lng: -78.5151, name: "Terminal Cajamarca" },
    arequipa: { lat: -16.409, lng: -71.5375, name: "Terminal Arequipa" },
    trujillo: { lat: -8.1116, lng: -79.0287, name: "Terminal Trujillo" },
  },
}

export interface RoutePoint {
  latitude: number
  longitude: number
  name: string
  address: string
  type?: "loading" | "delivery" | "waypoint"
}

export interface RouteInfo {
  distance: number // km
  estimatedTime: number // hours
  fuelConsumption: number // liters
  route: RoutePoint[]
  warnings: string[]
}

export interface TruckSpecs {
  capacity: number // gallons
  currentLoad: number // gallons
  fuelType: string
}

/**
 * Calcula información de ruta entre dos puntos
 */
export async function calculateRouteInfo(
  origin: RoutePoint,
  destination: RoutePoint,
  truckSpecs?: TruckSpecs,
): Promise<RouteInfo> {
  try {
    // Calcular distancia directa usando fórmula de Haversine
    const directDistance = calculateDistance(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude,
    )

    // Factor de corrección para distancia real por carretera (aproximadamente 1.3x la distancia directa)
    const roadDistance = directDistance * 1.3

    // Determinar tipo de ruta y velocidad promedio
    const routeType = determineRouteType(origin, destination)
    const averageSpeed = ROUTE_CONFIG.AVERAGE_SPEEDS[routeType]

    // Calcular tiempo estimado
    const estimatedTime = roadDistance / averageSpeed

    // Calcular consumo de combustible
    let fuelConsumption = 0
    if (truckSpecs) {
      const consumptionRate = getTruckConsumptionRate(truckSpecs.capacity)
      const loadFactor = getLoadFactor(truckSpecs.capacity, truckSpecs.currentLoad)
      fuelConsumption = (roadDistance / 100) * consumptionRate * loadFactor
    }

    // Generar advertencias
    const warnings = generateRouteWarnings(roadDistance, estimatedTime, origin, destination)

    return {
      distance: Math.round(roadDistance),
      estimatedTime: Math.round(estimatedTime * 10) / 10, // Redondear a 1 decimal
      fuelConsumption: Math.round(fuelConsumption * 10) / 10,
      route: [origin, destination],
      warnings,
    }
  } catch (error) {
    console.error("Error calculating route:", error)
    throw new Error("No se pudo calcular la información de ruta")
  }
}

/**
 * Obtiene el punto de carga más cercano
 */
export function getNearestLoadingPoint(destination: RoutePoint): RoutePoint {
  let nearestPoint = ROUTE_CONFIG.LOADING_POINTS.lima
  let minDistance = Number.POSITIVE_INFINITY

  for (const [key, point] of Object.entries(ROUTE_CONFIG.LOADING_POINTS)) {
    const distance = calculateDistance(destination.latitude, destination.longitude, point.lat, point.lng)

    if (distance < minDistance) {
      minDistance = distance
      nearestPoint = point
    }
  }

  return {
    latitude: nearestPoint.lat,
    longitude: nearestPoint.lng,
    name: nearestPoint.name,
    address: nearestPoint.name,
    type: "loading",
  }
}

/**
 * Determina el tipo de ruta basado en los puntos
 */
function determineRouteType(origin: RoutePoint, destination: RoutePoint): keyof typeof ROUTE_CONFIG.AVERAGE_SPEEDS {
  const distance = calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude)

  // Si la distancia es mayor a 100km, probablemente sea carretera
  if (distance > 100) {
    return "highway"
  }

  // Si ambos puntos están en Lima (área metropolitana), es urbano
  const limaArea = {
    minLat: -12.3,
    maxLat: -11.8,
    minLng: -77.2,
    maxLng: -76.8,
  }

  const originInLima = isPointInArea(origin, limaArea)
  const destinationInLima = isPointInArea(destination, limaArea)

  if (originInLima && destinationInLima) {
    return "urban"
  }

  // Si uno está en zona industrial (puertos, terminales)
  if (origin.type === "loading" || destination.type === "loading") {
    return "industrial"
  }

  // Por defecto, zona rural
  return "rural"
}

/**
 * Verifica si un punto está dentro de un área
 */
function isPointInArea(
  point: RoutePoint,
  area: { minLat: number; maxLat: number; minLng: number; maxLng: number },
): boolean {
  return (
    point.latitude >= area.minLat &&
    point.latitude <= area.maxLat &&
    point.longitude >= area.minLng &&
    point.longitude <= area.maxLng
  )
}

/**
 * Obtiene la tasa de consumo según el tamaño del camión
 */
function getTruckConsumptionRate(capacity: number): number {
  if (capacity <= 3000) {
    return ROUTE_CONFIG.FUEL_CONSUMPTION.small
  } else if (capacity <= 7500) {
    return ROUTE_CONFIG.FUEL_CONSUMPTION.medium
  } else {
    return ROUTE_CONFIG.FUEL_CONSUMPTION.large
  }
}

/**
 * Calcula el factor de carga
 */
function getLoadFactor(capacity: number, currentLoad: number): number {
  const loadPercentage = currentLoad / capacity

  if (loadPercentage < 0.3) {
    return ROUTE_CONFIG.LOAD_FACTOR.empty
  } else if (loadPercentage < 0.8) {
    return ROUTE_CONFIG.LOAD_FACTOR.partial
  } else {
    return ROUTE_CONFIG.LOAD_FACTOR.full
  }
}

/**
 * Genera advertencias para la ruta
 */
function generateRouteWarnings(distance: number, time: number, origin: RoutePoint, destination: RoutePoint): string[] {
  const warnings: string[] = []

  if (distance > 500) {
    warnings.push("Ruta larga: Considere paradas de descanso obligatorias")
  }

  if (time > 8) {
    warnings.push("Tiempo de viaje extenso: Verifique regulaciones de horas de conducción")
  }

  if (distance < 50) {
    warnings.push("Ruta corta: Verifique que sea económicamente viable")
  }

  // Verificar si cruza zonas de alta altitud (Andes)
  const highAltitudeZones = [
    { name: "Cajamarca", lat: -7.1619, lng: -78.5151 },
    { name: "Huancayo", lat: -12.0653, lng: -75.2049 },
    { name: "Cusco", lat: -13.5319, lng: -71.9675 },
    { name: "Arequipa", lat: -16.409, lng: -71.5375 },
  ]

  for (const zone of highAltitudeZones) {
    const distanceToZone = Math.min(
      calculateDistance(origin.latitude, origin.longitude, zone.lat, zone.lng),
      calculateDistance(destination.latitude, destination.longitude, zone.lat, zone.lng),
    )

    if (distanceToZone < 100) {
      warnings.push(`Ruta de alta altitud cerca de ${zone.name}: Considere efectos en rendimiento del vehículo`)
      break
    }
  }

  return warnings
}

/**
 * Formatea el tiempo en horas y minutos
 */
export function formatTime(hours: number): string {
  const wholeHours = Math.floor(hours)
  const minutes = Math.round((hours - wholeHours) * 60)

  if (wholeHours === 0) {
    return `${minutes} min`
  } else if (minutes === 0) {
    return `${wholeHours} hr${wholeHours > 1 ? "s" : ""}`
  } else {
    return `${wholeHours} hr${wholeHours > 1 ? "s" : ""} ${minutes} min`
  }
}

/**
 * Formatea la distancia
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  } else {
    return `${km.toLocaleString()} km`
  }
}

/**
 * Formatea el consumo de combustible
 */
export function formatFuelConsumption(liters: number): string {
  if (liters < 1) {
    return `${Math.round(liters * 1000)} ml`
  } else {
    return `${liters.toLocaleString()} L`
  }
}
