export interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy?: number
  altitude?: number
  heading?: number
  speed?: number
  timestamp: number
}

export interface GeolocationError {
  code: number
  message: string
}

export class GeolocationService {
  private static instance: GeolocationService
  private watchId: number | null = null
  private lastPosition: GeolocationPosition | null = null

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService()
    }
    return GeolocationService.instance
  }

  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada por este navegador"))
        return
      }

      const defaultOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
        ...options,
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
            timestamp: position.timestamp,
          }
          this.lastPosition = geoPosition
          resolve(geoPosition)
        },
        (error) => {
          reject(this.handleGeolocationError(error))
        },
        defaultOptions,
      )
    })
  }

  startWatching(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options?: PositionOptions,
  ): void {
    if (!navigator.geolocation) {
      onError({ code: 0, message: "Geolocalización no soportada" })
      return
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 30000,
      ...options,
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const geoPosition: GeolocationPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude || undefined,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
          timestamp: position.timestamp,
        }
        this.lastPosition = geoPosition
        onSuccess(geoPosition)
      },
      (error) => {
        onError(this.handleGeolocationError(error))
      },
      defaultOptions,
    )
  }

  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  getLastPosition(): GeolocationPosition | null {
    return this.lastPosition
  }

  private handleGeolocationError(error: GeolocationPositionError): GeolocationError {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return { code: 1, message: "Permiso de geolocalización denegado" }
      case error.POSITION_UNAVAILABLE:
        return { code: 2, message: "Ubicación no disponible" }
      case error.TIMEOUT:
        return { code: 3, message: "Tiempo de espera agotado" }
      default:
        return { code: 0, message: "Error desconocido de geolocalización" }
    }
  }

  // Validar si las coordenadas están dentro de Perú (aproximadamente)
  static isWithinPeru(latitude: number, longitude: number): boolean {
    // Límites aproximados de Perú
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
  }

  // Calcular distancia entre dos puntos (en metros)
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3 // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }

  // Formatear coordenadas para mostrar
  static formatCoordinates(latitude: number, longitude: number): string {
    const latDir = latitude >= 0 ? "N" : "S"
    const lonDir = longitude >= 0 ? "E" : "W"
    return `${Math.abs(latitude).toFixed(6)}°${latDir}, ${Math.abs(longitude).toFixed(6)}°${lonDir}`
  }
}
