export interface RoutePoint {
  lat: number
  lng: number
  timestamp?: Date
  speed?: number
  heading?: number
}

export interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

export interface OptimalView {
  lat: number
  lng: number
  zoom: number
}

export class MapUtils {
  // Centro por defecto (Lima, Perú)
  static readonly DEFAULT_CENTER = { lat: -12.0464, lng: -77.0428 }
  static readonly DEFAULT_ZOOM = 12

  // Calcular vista óptima para un conjunto de puntos
  static calculateOptimalView(points: RoutePoint[]): OptimalView {
    if (points.length === 0) {
      return { ...MapUtils.DEFAULT_CENTER, zoom: MapUtils.DEFAULT_ZOOM }
    }

    if (points.length === 1) {
      return { lat: points[0].lat, lng: points[0].lng, zoom: 15 }
    }

    const bounds = MapUtils.calculateBounds(points)
    const center = MapUtils.getBoundsCenter(bounds)
    const zoom = MapUtils.calculateZoomLevel(bounds)

    return { lat: center.lat, lng: center.lng, zoom }
  }

  // Calcular límites de un conjunto de puntos
  static calculateBounds(points: RoutePoint[]): MapBounds {
    if (points.length === 0) {
      return {
        north: MapUtils.DEFAULT_CENTER.lat + 0.01,
        south: MapUtils.DEFAULT_CENTER.lat - 0.01,
        east: MapUtils.DEFAULT_CENTER.lng + 0.01,
        west: MapUtils.DEFAULT_CENTER.lng - 0.01,
      }
    }

    let north = points[0].lat
    let south = points[0].lat
    let east = points[0].lng
    let west = points[0].lng

    for (const point of points) {
      north = Math.max(north, point.lat)
      south = Math.min(south, point.lat)
      east = Math.max(east, point.lng)
      west = Math.min(west, point.lng)
    }

    // Agregar un pequeño padding
    const latPadding = (north - south) * 0.1
    const lngPadding = (east - west) * 0.1

    return {
      north: north + latPadding,
      south: south - latPadding,
      east: east + lngPadding,
      west: west - lngPadding,
    }
  }

  // Obtener centro de los límites
  static getBoundsCenter(bounds: MapBounds): { lat: number; lng: number } {
    return {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    }
  }

  // Calcular nivel de zoom apropiado
  static calculateZoomLevel(bounds: MapBounds): number {
    const latDiff = bounds.north - bounds.south
    const lngDiff = bounds.east - bounds.west
    const maxDiff = Math.max(latDiff, lngDiff)

    if (maxDiff > 10) return 6
    if (maxDiff > 5) return 8
    if (maxDiff > 2) return 10
    if (maxDiff > 1) return 11
    if (maxDiff > 0.5) return 12
    if (maxDiff > 0.25) return 13
    if (maxDiff > 0.1) return 14
    return 15
  }

  // Formatear coordenadas para mostrar
  static formatCoordinates(lat: number, lng: number): string {
    const latDir = lat >= 0 ? "N" : "S"
    const lngDir = lng >= 0 ? "E" : "W"
    return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lng).toFixed(6)}°${lngDir}`
  }

  // Convertir a URL de Google Maps
  static toGoogleMapsUrl(lat: number, lng: number, zoom?: number): string {
    const z = zoom || 15
    return `https://www.google.com/maps/@${lat},${lng},${z}z`
  }

  // Convertir a URL de OpenStreetMap
  static toOpenStreetMapUrl(lat: number, lng: number, zoom?: number): string {
    const z = zoom || 15
    return `https://www.openstreetmap.org/#map=${z}/${lat}/${lng}`
  }

  // Calcular distancia entre dos puntos (Haversine)
  static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Radio de la Tierra en km
    const dLat = MapUtils.toRadians(lat2 - lat1)
    const dLng = MapUtils.toRadians(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(MapUtils.toRadians(lat1)) * Math.cos(MapUtils.toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Calcular distancia total de una ruta
  static calculateRouteDistance(points: RoutePoint[]): number {
    if (points.length < 2) return 0

    let totalDistance = 0
    for (let i = 1; i < points.length; i++) {
      totalDistance += MapUtils.calculateDistance(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng)
    }
    return totalDistance
  }

  // Convertir grados a radianes
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  // Validar coordenadas
  static isValidCoordinate(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  }

  // Verificar si está dentro de Perú
  static isWithinPeru(lat: number, lng: number): boolean {
    const peruBounds = {
      north: -0.012,
      south: -18.35,
      east: -68.65,
      west: -81.33,
    }

    return lat >= peruBounds.south && lat <= peruBounds.north && lng >= peruBounds.west && lng <= peruBounds.east
  }
}
