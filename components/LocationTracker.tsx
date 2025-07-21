"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Navigation, MapPin, Clock, Wifi, WifiOff, Play, Pause, RotateCcw, TrendingUp } from "lucide-react"
import { GeolocationService, type GeolocationPosition } from "@/lib/geolocation"

interface LocationTrackerProps {
  truckId?: number
  dispatchId?: number
  onLocationUpdate?: (position: GeolocationPosition) => void
  autoStart?: boolean
  trackingInterval?: number // en segundos
  className?: string
}

interface TrackingStats {
  totalDistance: number
  averageSpeed: number
  maxSpeed: number
  trackingTime: number
  pointsRecorded: number
}

export function LocationTracker({
  truckId,
  dispatchId,
  onLocationUpdate,
  autoStart = false,
  trackingInterval = 30,
  className,
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false)
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [error, setError] = useState<string>("")
  const [stats, setStats] = useState<TrackingStats>({
    totalDistance: 0,
    averageSpeed: 0,
    maxSpeed: 0,
    trackingTime: 0,
    pointsRecorded: 0,
  })

  const geolocationService = GeolocationService.getInstance()
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const positionsRef = useRef<GeolocationPosition[]>([])
  const offlineQueueRef = useRef<GeolocationPosition[]>([])

  // Monitorear estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncOfflineData()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Auto-iniciar si está configurado
  useEffect(() => {
    if (autoStart) {
      startTracking()
    }

    return () => {
      stopTracking()
    }
  }, [autoStart])

  const startTracking = async () => {
    try {
      setError("")
      setIsTracking(true)
      startTimeRef.current = new Date()

      // Obtener posición inicial
      const initialPosition = await geolocationService.getCurrentPosition()
      handleLocationUpdate(initialPosition)

      // Configurar seguimiento continuo
      trackingIntervalRef.current = setInterval(async () => {
        try {
          const position = await geolocationService.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000,
          })
          handleLocationUpdate(position)
        } catch (err) {
          console.warn("Error obteniendo posición:", err)
        }
      }, trackingInterval * 1000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al iniciar seguimiento"
      setError(errorMessage)
      setIsTracking(false)
    }
  }

  const stopTracking = () => {
    setIsTracking(false)
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current)
      trackingIntervalRef.current = null
    }
    geolocationService.stopWatching()
  }

  const handleLocationUpdate = (position: GeolocationPosition) => {
    setCurrentPosition(position)
    positionsRef.current.push(position)

    // Actualizar estadísticas
    updateStats(position)

    // Callback externo
    onLocationUpdate?.(position)

    // Enviar al servidor
    if (isOnline) {
      sendLocationToServer(position)
    } else {
      // Guardar en cola offline
      offlineQueueRef.current.push(position)
    }
  }

  const updateStats = (newPosition: GeolocationPosition) => {
    const positions = positionsRef.current
    const startTime = startTimeRef.current

    if (positions.length < 2 || !startTime) return

    // Calcular distancia total
    let totalDistance = 0
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1]
      const curr = positions[i]
      totalDistance += GeolocationService.calculateDistance(
        prev.latitude,
        prev.longitude,
        curr.latitude,
        curr.longitude,
      )
    }

    // Calcular velocidades
    const speeds = positions.filter((p) => p.speed && p.speed > 0).map((p) => p.speed!)
    const averageSpeed = speeds.length > 0 ? speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length : 0
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0

    // Tiempo de seguimiento
    const trackingTime = (Date.now() - startTime.getTime()) / 1000 / 60 // en minutos

    setStats({
      totalDistance: totalDistance / 1000, // convertir a km
      averageSpeed: averageSpeed * 3.6, // convertir m/s a km/h
      maxSpeed: maxSpeed * 3.6,
      trackingTime,
      pointsRecorded: positions.length,
    })
  }

  const sendLocationToServer = async (position: GeolocationPosition) => {
    try {
      const payload = {
        type: truckId ? "truck_location" : "dispatch_location",
        truckId,
        dispatchId,
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        speed: position.speed,
        heading: position.heading,
        altitude: position.altitude,
        batteryLevel: getBatteryLevel(),
        isMoving: (position.speed || 0) > 0.5, // Considerado en movimiento si > 0.5 m/s
      }

      const response = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error("Error enviando ubicación al servidor")
      }
    } catch (err) {
      console.error("Error enviando ubicación:", err)
      // Agregar a cola offline si falla
      offlineQueueRef.current.push(position)
    }
  }

  const syncOfflineData = async () => {
    if (offlineQueueRef.current.length === 0) return

    console.log(`Sincronizando ${offlineQueueRef.current.length} ubicaciones offline...`)

    const queue = [...offlineQueueRef.current]
    offlineQueueRef.current = []

    for (const position of queue) {
      try {
        await sendLocationToServer(position)
      } catch (err) {
        // Si falla, volver a agregar a la cola
        offlineQueueRef.current.push(position)
      }
    }
  }

  const getBatteryLevel = (): number | undefined => {
    // @ts-ignore - Battery API no está en tipos estándar
    if ("getBattery" in navigator) {
      // @ts-ignore
      navigator.getBattery().then((battery) => {
        return Math.round(battery.level * 100)
      })
    }
    return undefined
  }

  const resetStats = () => {
    setStats({
      totalDistance: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      trackingTime: 0,
      pointsRecorded: 0,
    })
    positionsRef.current = []
    startTimeRef.current = new Date()
  }

  const getConnectionStatus = () => {
    if (isOnline) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Wifi className="h-3 w-3 mr-1" />
          En línea
        </Badge>
      )
    } else {
      return (
        <Badge variant="destructive">
          <WifiOff className="h-3 w-3 mr-1" />
          Sin conexión ({offlineQueueRef.current.length} pendientes)
        </Badge>
      )
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Navigation className="h-4 w-4" />
            Seguimiento GPS
          </CardTitle>
          {getConnectionStatus()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Controles */}
        <div className="flex gap-2">
          <Button
            onClick={isTracking ? stopTracking : startTracking}
            variant={isTracking ? "destructive" : "default"}
            className="flex-1"
          >
            {isTracking ? (
              <>
                <Pause className="mr-2 h-4 w-4" />
                Detener
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Iniciar
              </>
            )}
          </Button>

          <Button onClick={resetStats} variant="outline" size="icon" disabled={isTracking}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Posición actual */}
        {currentPosition && (
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">Posición actual</span>
              <Badge variant="outline" className="text-xs">
                ±{Math.round(currentPosition.accuracy || 0)}m
              </Badge>
            </div>
            <div className="text-xs text-blue-700 space-y-1">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {GeolocationService.formatCoordinates(currentPosition.latitude, currentPosition.longitude)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(currentPosition.timestamp).toLocaleTimeString()}
              </div>
              {currentPosition.speed && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {Math.round(currentPosition.speed * 3.6)} km/h
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-900">{stats.totalDistance.toFixed(1)}</div>
            <div className="text-xs text-gray-600">km recorridos</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-900">{Math.round(stats.averageSpeed)}</div>
            <div className="text-xs text-gray-600">km/h promedio</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-900">{Math.round(stats.trackingTime)}</div>
            <div className="text-xs text-gray-600">min seguimiento</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="text-lg font-bold text-gray-900">{stats.pointsRecorded}</div>
            <div className="text-xs text-gray-600">puntos GPS</div>
          </div>
        </div>

        {/* Progreso de seguimiento */}
        {isTracking && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Próxima actualización</span>
              <span>{trackingInterval}s</span>
            </div>
            <Progress value={100} className="h-1" />
          </div>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Información adicional */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>Intervalo: cada {trackingInterval} segundos</div>
          <div>Precisión: GPS de alta precisión</div>
          {!isOnline && <div>Modo offline: las ubicaciones se sincronizarán cuando haya conexión</div>}
        </div>
      </CardContent>
    </Card>
  )
}
