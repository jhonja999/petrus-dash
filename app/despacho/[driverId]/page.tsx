"use client"

import type React from "react"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import {
  Truck,
  MapPin,
  Clock,
  ArrowLeft,
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Target,
  Loader2,
  RefreshCw,
  Fuel,
  BellRing,
  Camera,
  Share2,
  Car,
  Check,
  Wifi,
  WifiOff,
  Route,
  Timer,
  Navigation,
  TrendingUp,
  Activity,
} from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns" // Import addMinutes
import { es } from "date-fns/locale"
import type { FuelType } from "@/types/globals"
import { FUEL_TYPE_LABELS } from "@/types/globals"

// Estilos para animaciones
const styles = `
@keyframes fadeIn {
from { opacity: 0; }
to { opacity: 1; }
}

.animate-fadeIn {
animation: fadeIn 0.3s ease-out;
}
@keyframes pulse {
0% { transform: scale(1); }
50% { transform: scale(1.05); }
100% { transform: scale(1); }
}
.animate-pulse-once {
animation: pulse 0.5s ease-in-out;
}
.header-bg {
background: linear-gradient(to right, #2c3e50, #4a69bd);
}
.header-text {
color: #ecf0f1;
}

@keyframes slideIn {
from { transform: translateY(-10px); opacity: 0; }
to { transform: translateY(0); opacity: 1; }
}
.animate-slideIn {
animation: slideIn 0.3s ease-out;
}

.route-card {
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-card {
background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.progress-card {
background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
`

interface ClientAssignment {
  id: number
  customerId: number
  allocatedQuantity: number | string
  deliveredQuantity: number | string
  remainingQuantity: number | string
  status: string
  completedAt?: Date | string | null
  customer: {
    id: number
    companyname: string
    ruc: string
    address?: string
  }
  assignmentId: number
  deliveryLatitude?: number
  deliveryLongitude?: number
}

interface ExtendedAssignment {
  id: number
  driverId: number
  truckId: number
  fuelType: string
  totalLoaded: number | string
  totalRemaining: number | string
  isCompleted: boolean
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  notes?: string | null
  driver: {
    id: number
    name: string
    lastname: string
  }
  truck: {
    id: number
    placa: string
    capacidad: number
    currentLoad?: number | string
    capacitygal?: number
    currentLatitude?: number
    currentLongitude?: number
  }
  clientAssignments?: ClientAssignment[]
  dispatchNumber?: string
  status?: "PROGRAMADO" | "CARGANDO" | "EN_RUTA" | "COMPLETADO" | "CANCELADO" | "BORRADOR"
  customer?: {
    id: number
    companyname: string
    ruc: string
    address?: string
  }
  quantity?: number | string
  address?: string
  scheduledDate?: Date | string
  deliveredQuantity?: number | string
  deliveryLatitude?: number
  deliveryLongitude?: number
  customFuelName?: string
  currentLatitude?: number // truck's last known currentLatitude
  currentLongitude?: number // truck's last known currentLongitude
  loadPointLatitude?: number
  loadPointLongitude?: number
}

interface RouteData {
  totalDistance: number
  totalTime: number
  completedStops: number
  totalStops: number
  currentSpeed: number
  averageSpeed: number
  fuelConsumed: number
  estimatedArrival?: Date
  routeEfficiency: number
  lastLocationUpdate: Date
  locations: Array<{
    id: number
    latitude: number
    longitude: number
    timestamp: string
    speed?: number
    accuracy?: number
  }>
  distanceToNextStop: number
  estimatedTimeToNextStop: number
  nextStopAddress: string | null
}

interface LocationPoint {
  id: number
  latitude: number
  longitude: number
  timestamp: Date
  speed?: number
  accuracy?: number
}

interface PhotoRecord {
  type: "odometer_initial" | "start_load" | "client_delivery" | "conformity"
  url?: string
  timestamp?: string
}

const DISPATCH_STATUS_CONFIG = {
  PROGRAMADO: {
    label: "Programado",
    color: "bg-blue-600 text-blue-50",
    icon: Clock,
  },
  CARGANDO: {
    label: "Cargando",
    color: "bg-yellow-600 text-yellow-50",
    icon: Truck,
  },
  EN_RUTA: {
    label: "En Ruta",
    color: "bg-orange-600 text-orange-50",
    icon: Car,
  },
  COMPLETADO: {
    label: "Completado",
    color: "bg-green-600 text-green-50",
    icon: CheckCircle,
  },
  CANCELADO: {
    label: "Cancelado",
    color: "bg-red-600 text-red-50",
    icon: AlertTriangle,
  },
  BORRADOR: {
    label: "Borrador",
    color: "bg-gray-600 text-gray-50",
    icon: FileText,
  },
}

// Función para calcular distancia entre dos puntos (fórmula de Haversine)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Función para calcular tiempo transcurrido
const calculateTimeInRoute = (startTime: Date): number => {
  const now = new Date()
  return Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60)) // en minutos
}

// Función de sincronización para día actual con mejor manejo de errores
const syncOperatorData = async (driverId: string) => {
  try {
    console.log("🔄 Iniciando sincronización de datos del operador...")

    const results = await Promise.allSettled([
      axios.post("/api/assignments/auto-complete", { driverId: Number(driverId) }),
      axios.post("/api/assignments/sync-operator", { driverId: Number(driverId) }),
    ])

    let successCount = 0
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successCount++
        console.log(`✅ Operación ${index + 1} completada con éxito`)
      } else {
        console.warn(`⚠️ Operación ${index + 1} falló:`, result.reason?.message || result.reason)
      }
    })

    console.log(`✅ Sincronización completada (${successCount}/${results.length} operaciones exitosas)`)
    return successCount > 0
  } catch (error) {
    console.error("❌ Error en sincronización:", error)
    return false
  }
}

export default function DespachoDriverPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const driverId = params.driverId as string

  // Estados principales
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number | null
    lng: number | null
    altitude: number | null
    accuracy: number | null
    address: string | null
  } | null>(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  // Estados para datos de ruta
  const [routeData, setRouteData] = useState<RouteData>({
    totalDistance: 0,
    totalTime: 0,
    completedStops: 0,
    totalStops: 0,
    currentSpeed: 0,
    averageSpeed: 0,
    fuelConsumed: 0,
    routeEfficiency: 0,
    lastLocationUpdate: new Date(),
    locations: [],
    distanceToNextStop: 0,
    estimatedTimeToNextStop: 0,
    nextStopAddress: null,
  })
  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([])
  const [routeStartTime, setRouteStartTime] = useState<Date | null>(null)

  // Estados para el modal
  const [selectedClientAssignment, setSelectedClientAssignment] = useState<ClientAssignment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Modal states for completing delivery
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false)
  const [selectedDispatchForCompletion, setSelectedDispatchForCompletion] = useState<ExtendedAssignment | null>(null)
  const [isProcessingDelivery, setIsProcessingDelivery] = useState(false)

  // Emergency Modal States
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false)
  const [emergencyNotes, setEmergencyNotes] = useState<string>("")
  const [isSendingEmergency, setIsSendingEmergency] = useState<boolean>(false)

  // Photo Documentation States
  const [photos, setPhotos] = useState<PhotoRecord[]>([
    { type: "odometer_initial" },
    { type: "start_load" },
    { type: "client_delivery" },
    { type: "conformity" },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [currentPhotoType, setCurrentPhotoType] = useState<PhotoRecord["type"] | null>(null)

  // Monitorear conexión a internet
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "🌐 Conectado",
        description: "Conexión a internet restablecida",
        className: "border-green-200 bg-green-50",
      })
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "🌐 Sin conexión",
        description: "No hay conexión a internet. Algunas funciones pueden no estar disponibles.",
        variant: "destructive",
      })
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [toast])

  // Basic auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("🔒 DespachoDriverPage: User not authenticated")
      router.push("/login")
      return
    }
  }, [isLoading, isAuthenticated, router])

  // Real-time Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Función para obtener datos de ruta desde la base de datos
  const fetchRouteData = useCallback(async () => {
    if (!driverId || !isOnline) return

    try {
      const today = new Date().toISOString().split("T")[0]

      // Obtener historial de ubicaciones del día usando el endpoint corregido
      const locationResponse = await axios.get(
        `/api/locations?type=driver_route_history&driverId=${driverId}&date=${today}`,
      )

      if (locationResponse.data.success) {
        const locations: LocationPoint[] = locationResponse.data.data || []
        setLocationHistory(locations)

        if (locations.length > 1) {
          // Calcular distancia total recorrida
          let totalDistance = 0
          for (let i = 1; i < locations.length; i++) {
            const distance = calculateDistance(
              locations[i - 1].latitude,
              locations[i - 1].longitude,
              locations[i].latitude,
              locations[i].longitude,
            )
            totalDistance += distance
          }

          // Obtener datos de despachos para calcular paradas
          const activeAssignments = assignments.filter((a) => a.status === "EN_RUTA" || a.status === "COMPLETADO")
          const completedStops = assignments.filter((a) => a.status === "COMPLETADO").length
          const totalStops = activeAssignments.length

          // Calcular tiempo en ruta
          const firstLocation = locations[0]
          const lastLocation = locations[locations.length - 1]
          const timeInRoute = calculateTimeInRoute(new Date(firstLocation.timestamp))

          // Calcular velocidad promedio
          const averageSpeed = timeInRoute > 0 ? totalDistance / (timeInRoute / 60) : 0

          // Velocidad actual (basada en las últimas ubicaciones)
          let currentSpeed = 0
          if (locations.length >= 2) {
            const recent = locations.slice(-2)
            const timeDiff =
              (new Date(recent[1].timestamp).getTime() - new Date(recent[0].timestamp).getTime()) / (1000 * 60 * 60) // horas
            const distanceDiff = calculateDistance(
              recent[0].latitude,
              recent[0].longitude,
              recent[1].latitude,
              recent[1].longitude,
            )
            currentSpeed = timeDiff > 0 ? distanceDiff / timeDiff : 0
          }

          // Calcular eficiencia de ruta (simplificado)
          const routeEfficiency = Math.min(100, Math.max(0, totalStops > 0 ? (completedStops / totalStops) * 100 : 0))

          // Estimar consumo de combustible (aproximado: 0.3L por km)
          const fuelConsumed = totalDistance * 0.3

          // Calculate distance and estimated time to next stop
          let distanceToNextStop = 0
          let estimatedTimeToNextStop = 0
          let nextStopAddress: string | null = null

          const currentTruckLocation = currentLocation || {
            lat: lastLocation.latitude,
            lng: lastLocation.longitude,
          }

          const firstPendingClientAssignment = assignments
            .find((a) => a.status === "EN_RUTA") // Find an active assignment
            ?.clientAssignments?.find((ca) => ca.status === "pending") // Find its first pending client assignment

          if (
            firstPendingClientAssignment &&
            firstPendingClientAssignment.deliveryLatitude &&
            firstPendingClientAssignment.deliveryLongitude &&
            currentTruckLocation.lat &&
            currentTruckLocation.lng
          ) {
            distanceToNextStop = calculateDistance(
              currentTruckLocation.lat,
              currentTruckLocation.lng,
              firstPendingClientAssignment.deliveryLatitude,
              firstPendingClientAssignment.deliveryLongitude,
            )
            nextStopAddress =
              firstPendingClientAssignment.customer.address || firstPendingClientAssignment.customer.companyname
            if (currentSpeed > 5) {
              // Only estimate time if speed is reasonable
              estimatedTimeToNextStop = (distanceToNextStop / currentSpeed) * 60 // in minutes
            } else if (distanceToNextStop > 0) {
              // Fallback: if truck is stopped or very slow, assume a walking pace or general slow movement.
              // e.g., 5 km/h if stopped, 30 km/h if very slow to prevent infinite time.
              const assumedSpeed = 20 // km/h for estimation when currentSpeed is low
              estimatedTimeToNextStop = (distanceToNextStop / assumedSpeed) * 60
            }
          }

          // Convert timestamp to string for compatibility
          const formattedLocations = locations.map((loc) => ({
            id: loc.id,
            latitude: loc.latitude,
            longitude: loc.longitude,
            timestamp: loc.timestamp.toISOString(),
            speed: loc.speed,
            accuracy: loc.accuracy,
          }))

          setRouteData({
            totalDistance: Number(totalDistance.toFixed(1)),
            totalTime: timeInRoute,
            completedStops,
            totalStops,
            currentSpeed: Number(currentSpeed.toFixed(1)),
            averageSpeed: Number(averageSpeed.toFixed(1)),
            fuelConsumed: Number(fuelConsumed.toFixed(1)),
            routeEfficiency: Number(routeEfficiency.toFixed(1)),
            lastLocationUpdate: new Date(lastLocation.timestamp),
            locations: formattedLocations,
            distanceToNextStop: Number(distanceToNextStop.toFixed(1)),
            estimatedTimeToNextStop: Number(estimatedTimeToNextStop.toFixed(0)), // Round to nearest minute
            nextStopAddress,
          })

          // Set route start time if not set
          if (!routeStartTime && activeAssignments.length > 0) {
            setRouteStartTime(new Date(firstLocation.timestamp))
          }
        } else {
          // If not enough locations, use basic assignment data
          const activeAssignments = assignments.filter((a) => a.status === "EN_RUTA" || a.status === "COMPLETADO")
          const completedStops = assignments.filter((a) => a.status === "COMPLETADO").length
          const totalStops = activeAssignments.length

          setRouteData((prev) => ({
            ...prev,
            completedStops,
            totalStops,
            routeEfficiency: totalStops > 0 ? (completedStops / totalStops) * 100 : 0,
            locations: [],
            distanceToNextStop: 0,
            estimatedTimeToNextStop: 0,
            nextStopAddress: null,
          }))
        }
      }
    } catch (error) {
      console.error("Error fetching route data:", error)
      // In case of error, use basic assignment data
      const activeAssignments = assignments.filter((a) => a.status === "EN_RUTA" || a.status === "COMPLETADO")
      const completedStops = assignments.filter((a) => a.status === "COMPLETADO").length
      const totalStops = activeAssignments.length

      setRouteData((prev) => ({
        ...prev,
        completedStops,
        totalStops,
        routeEfficiency: totalStops > 0 ? (completedStops / totalStops) * 100 : 0,
        locations: [],
        distanceToNextStop: 0,
        estimatedTimeToNextStop: 0,
        nextStopAddress: null,
      }))
    }
  }, [driverId, isOnline, assignments, routeStartTime, currentLocation])

  // Location Tracking (improved with better error handling)
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported")
      setGpsPermissionDenied(true)
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, altitude, accuracy, speed, heading } = position.coords
          // Reverse geocode to get a more human-readable address
          let fetchedAddress: string | null = `Lat: ${latitude.toFixed(4)}°, Lng: ${longitude.toFixed(4)}°`
          try {
            const geoResponse = await axios.get(`/api/locations/reverse-geocode?lat=${latitude}&lon=${longitude}`)
            if (geoResponse.data.success && geoResponse.data.address) {
              fetchedAddress = geoResponse.data.address
            }
          } catch (geoError) {
            console.warn("Reverse geocoding failed:", geoError)
          }

          setCurrentLocation({ lat: latitude, lng: longitude, altitude, accuracy, address: fetchedAddress })
          setGpsPermissionDenied(false)
          setIsGettingLocation(false)

          // Send location to backend using existing functionality
          if (user?.id && isOnline) {
            try {
              await axios.post("/api/locations", {
                type: "driver_location",
                driverId: user.id,
                latitude,
                longitude,
                accuracy,
                altitude,
                speed,
                heading,
              })
              console.log("✅ Ubicación del conductor enviada al backend.")

              // Update route data after sending location
              fetchRouteData()
            } catch (apiError) {
              console.warn("⚠️ Error al enviar ubicación:", apiError)
            }
          }
        } catch (error) {
          console.error("Error procesando ubicación:", error)
          setIsGettingLocation(false)
        }
      },
      (error) => {
        console.warn(`⚠️ Geolocation error [Code: ${error.code}]:`, error.message)

        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsPermissionDenied(true)
            break
          case error.POSITION_UNAVAILABLE:
            console.log("GPS position unavailable")
            break
          case error.TIMEOUT:
            console.log("GPS timeout")
            break
        }

        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      },
    )
  }, [user?.id, isOnline, fetchRouteData])

  useEffect(() => {
    getCurrentLocation()
    const locationInterval = setInterval(() => {
      if (!gpsPermissionDenied && isOnline) {
        getCurrentLocation()
      }
    }, 30000)
    return () => clearInterval(locationInterval)
  }, [getCurrentLocation, gpsPermissionDenied, isOnline])

  // Función principal para cargar datos
  const fetchData = async (dateToFetch?: string) => {
    if (!driverId || isNaN(Number(driverId))) {
      setError(`ID de conductor inválido: "${driverId}"`)
      setLoading(false)
      return
    }

    try {
      setError(null)
      const targetDate = dateToFetch || selectedDate
      const today = new Date().toISOString().split("T")[0]

      console.log(`🔄 Fetching assignments for driver ${driverId} on ${targetDate}`)

      if (!isOnline) {
        console.log("📱 Modo offline - saltando sincronización")
      } else if (targetDate === today) {
        const syncSuccess = await syncOperatorData(driverId)
        if (syncSuccess) {
          console.log("✅ Datos sincronizados correctamente")
        }
      }

      let assignmentsResponse

      try {
        if (targetDate === today) {
          assignmentsResponse = await axios.get(`/api/assignments/active?driverId=${driverId}`)
        } else {
          assignmentsResponse = await axios.get(`/api/assignments/dashboard?driverId=${driverId}&date=${targetDate}`)
        }
      } catch (apiError) {
        console.warn("⚠️ Error en API de assignments, usando fallback...")
        assignmentsResponse = { data: [] }
      }

      setAssignments(assignmentsResponse.data)
      setLastRefresh(new Date())

      // Cargar datos de ruta si es el día actual
      if (targetDate === today) {
        await fetchRouteData()
      }

      if (targetDate === today && assignmentsResponse.data.length === 0) {
        if (isOnline) {
          toast({
            title: "📋 Sin asignaciones activas",
            description: "No tienes asignaciones activas en este momento.",
          })
        }
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error)
      let errorMessage = "Error al cargar los datos"
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 500) {
          errorMessage = "El servidor está experimentando problemas."
        } else {
          errorMessage = error.response?.data?.error || errorMessage
        }
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Función de actualización/sincronización
  const handleRefresh = async () => {
    if (!isOnline) {
      toast({
        title: "🌐 Sin conexión",
        description: "No hay conexión a internet para actualizar los datos.",
        variant: "destructive",
      })
      return
    }

    setIsRefreshing(true)
    const today = new Date().toISOString().split("T")[0]
    const isToday = selectedDate === today

    try {
      if (isToday) {
        const syncSuccess = await syncOperatorData(driverId)
        if (syncSuccess) {
          toast({
            title: "✅ Datos sincronizados",
            description: "Los datos han sido sincronizados correctamente.",
            className: "border-green-200 bg-green-50",
          })
        }
      }

      await fetchData(selectedDate)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron actualizar todos los datos.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Cargar datos al inicializar
  useEffect(() => {
    fetchData()
  }, [driverId])

  // Cargar datos cuando cambie la fecha
  useEffect(() => {
    if (selectedDate) {
      setLoading(true)
      fetchData(selectedDate)
    }
  }, [selectedDate])

  // Auto-refresh cada 5 minutos si es el día actual
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    if (selectedDate === today && isOnline) {
      const interval = setInterval(
        () => {
          console.log("🔄 Auto-refreshing current day assignments")
          fetchData(selectedDate)
        },
        5 * 60 * 1000,
      )

      return () => clearInterval(interval)
    }
  }, [selectedDate, isOnline])

  // Actualizar datos de ruta cuando cambien las asignaciones
  useEffect(() => {
    if (assignments.length > 0) {
      fetchRouteData()
    }
  }, [assignments, fetchRouteData])

  // Funciones del modal
  const openClientAssignmentModal = (clientAssignment: ClientAssignment, assignment: ExtendedAssignment) => {
    setSelectedClientAssignment(clientAssignment)
    setIsModalOpen(true)
    setMarcadorInicial(assignment.totalRemaining.toString())
    setMarcadorFinal("")
  }

  const openDeliveryModal = (dispatch: ExtendedAssignment) => {
    setSelectedDispatchForCompletion(dispatch)
    setIsDeliveryModalOpen(true)
    setMarcadorInicial(dispatch.truck.currentLoad ? Number(dispatch.truck.currentLoad).toFixed(2) : "0.00")
    setMarcadorFinal("")
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedClientAssignment(null)
    setMarcadorInicial("")
    setMarcadorFinal("")
  }

  const closeDeliveryModal = () => {
    setIsDeliveryModalOpen(false)
    setSelectedDispatchForCompletion(null)
    setMarcadorInicial("")
    setMarcadorFinal("")
  }

  const calculateDeliveredAmount = () => {
    const deliveredAmount = Number.parseFloat(marcadorFinal) || 0
    return deliveredAmount > 0 ? Number.parseFloat(deliveredAmount.toFixed(2)) : 0
  }

  const calculateDeliveredAmount2 = useCallback(() => {
    const deliveredAmount = Number.parseFloat(marcadorFinal) || 0
    return deliveredAmount > 0 ? Number.parseFloat(deliveredAmount.toFixed(2)) : 0
  }, [marcadorFinal])

  const completeClientAssignment = async () => {
    if (!isOnline) {
      toast({
        title: "🌐 Sin conexión",
        description: "Necesitas conexión a internet para completar la entrega.",
        variant: "destructive",
      })
      return
    }

    if (!selectedClientAssignment || !marcadorInicial || !marcadorFinal) {
      toast({
        title: "❌ Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      })
      return
    }

    const deliveredAmount = calculateDeliveredAmount()
    if (deliveredAmount <= 0) {
      toast({
        title: "❌ Error",
        description: "La cantidad entregada debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    const availableFuel = Number.parseFloat(marcadorInicial)
    if (deliveredAmount > availableFuel) {
      toast({
        title: "❌ Error",
        description: `No se puede entregar ${deliveredAmount.toFixed(2)} galones. Solo hay ${availableFuel.toFixed(2)} galones disponibles.`,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const response = await axios.put(
        `/api/assignments/${selectedClientAssignment.assignmentId}/clients/${selectedClientAssignment.id}`,
        {
          status: "completed",
          deliveredQuantity: deliveredAmount,
          allocatedQuantity: selectedClientAssignment.allocatedQuantity,
          marcadorInicial: marcadorInicial,
          marcadorFinal: marcadorFinal,
        },
      )

      toast({
        title: "✅ Entrega completada",
        description: `${selectedClientAssignment.customer.companyname} - ${deliveredAmount.toFixed(2)} galones entregados`,
      })

      closeModal()
      const syncSuccess = await syncOperatorData(driverId)
      if (syncSuccess) {
        toast({
          title: "🔄 Datos sincronizados",
          description: "Los dashboards han sido actualizados automáticamente.",
          className: "border-green-200 bg-green-50",
        })
      }

      await fetchData(selectedDate)
    } catch (error) {
      console.error("❌ Error completing assignment:", error)
      let errorMessage = "Error al completar la entrega"
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || errorMessage
      }
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const completeDispatchDelivery = async () => {
    if (!isOnline) {
      toast({
        title: "🌐 Sin conexión",
        description: "Necesitas conexión a internet para completar la entrega.",
        variant: "destructive",
      })
      return
    }

    if (!selectedDispatchForCompletion || !marcadorInicial || !marcadorFinal) {
      toast({
        title: "❌ Error",
        description: "Por favor complete todos los campos",
        variant: "destructive",
      })
      return
    }

    const deliveredAmount = calculateDeliveredAmount2()
    if (deliveredAmount <= 0) {
      toast({
        title: "❌ Error",
        description: "La cantidad entregada debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    setIsProcessingDelivery(true)

    try {
      const response = await axios.put(`/api/dispatches/${selectedDispatchForCompletion.id}`, {
        status: "COMPLETADO",
        deliveredQuantity: deliveredAmount,
        marcadorInicial: Number(marcadorInicial),
        marcadorFinal: deliveredAmount,
      })

      if (response.data.success) {
        toast({
          title: "✅ Entrega completada",
          description: `Despacho ${selectedDispatchForCompletion.dispatchNumber} - ${deliveredAmount.toFixed(2)} galones entregados`,
        })
        closeDeliveryModal()
        await handleRefresh()
      } else {
        throw new Error(response.data.error || "Error al completar la entrega")
      }
    } catch (error) {
      console.error("❌ Error completing delivery:", error)
      let errorMessage = "Error al completar la entrega"
      if (axios.isAxiosError(error)) {
        errorMessage = error.response?.data?.error || errorMessage
      }
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessingDelivery(false)
    }
  }

  // Obtener entregas para el día seleccionado
  const getAllPendingDeliveries = () => {
    const pendingDeliveries: (ClientAssignment & { assignment: ExtendedAssignment })[] = []

    assignments.forEach((assignment) => {
      if (assignment.clientAssignments) {
        assignment.clientAssignments.forEach((clientAssignment) => {
          if (clientAssignment.status === "pending") {
            pendingDeliveries.push({
              ...clientAssignment,
              assignment: assignment,
            })
          }
        })
      }
    })

    return pendingDeliveries
  }

  // Photo Documentation Logic
  const handlePhotoUploadClick = (type: PhotoRecord["type"]) => {
    setCurrentPhotoType(type)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentPhotoType) return

    setIsProcessingDelivery(true)

    try {
      const imageUrl = URL.createObjectURL(file)

      setPhotos((prev) =>
        prev.map((p) =>
          p.type === currentPhotoType ? { ...p, url: imageUrl, timestamp: new Date().toISOString() } : p,
        ),
      )

      toast({
        title: "Foto cargada",
        description: `Foto de ${currentPhotoType.replace(/_/g, " ")} subida con éxito.`,
      })
    } catch (error) {
      console.error("Error uploading photo:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la foto.",
        variant: "destructive",
      })
    } finally {
      setIsProcessingDelivery(false)
      setCurrentPhotoType(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // Emergency Button Logic
  const handleEmergencySubmit = async () => {
    if (!emergencyNotes.trim()) {
      toast({
        title: "Nota Requerida",
        description: "Por favor, describe la incidencia.",
        variant: "destructive",
      })
      return
    }

    setIsSendingEmergency(true)
    try {
      console.log("Sending emergency report:", { driverId, notes: emergencyNotes, timestamp: new Date() })

      toast({
        title: "🚨 Reporte de Emergencia Enviado",
        description: "Tu reporte ha sido enviado. Permanece seguro.",
        className: "border-red-200 bg-red-50",
      })
      setIsEmergencyModalOpen(false)
      setEmergencyNotes("")
    } catch (error) {
      console.error("Error sending emergency:", error)
      toast({
        title: "❌ Error al enviar emergencia",
        description: "No se pudo enviar el reporte. Intenta de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmergency(false)
    }
  }

  const getAllCompletedDeliveries = () => {
    const completedDeliveries: (ClientAssignment & { assignment: ExtendedAssignment })[] = []

    assignments.forEach((assignment) => {
      if (assignment.clientAssignments) {
        assignment.clientAssignments.forEach((clientAssignment) => {
          if (clientAssignment.status === "completed") {
            completedDeliveries.push({
              ...clientAssignment,
              assignment: assignment,
            })
          }
        })
      }
    })

    return completedDeliveries
  }

  // Helper for UI elements
  const getStatusBadge = (status: ExtendedAssignment["status"]) => {
    const config = DISPATCH_STATUS_CONFIG[status || "PROGRAMADO"] || DISPATCH_STATUS_CONFIG.PROGRAMADO
    const Icon = config.icon
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  // Formatear tiempo en formato legible
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60) // Round minutes
    if (hours > 0 && mins > 0) return `${hours}h ${mins}min`
    if (hours > 0) return `${hours}h`
    if (mins > 0) return `${mins}min`
    return "0min"
  }

  const pendingDeliveries = getAllPendingDeliveries()
  const completedDeliveries = getAllCompletedDeliveries()
  const totalDeliveries = pendingDeliveries.length + completedDeliveries.length
  const currentTruck = assignments.length > 0 ? assignments[0].truck : null
  const isTodayCheck = selectedDate === new Date().toISOString().split("T")[0]

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center animate-slideIn">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando panel del conductor...</p>
          {!isOnline && (
            <p className="text-orange-600 text-sm mt-2">🌐 Sin conexión - Intentando cargar datos locales</p>
          )}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full animate-slideIn">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            {!isOnline && (
              <Alert className="border-orange-200 bg-orange-50">
                <WifiOff className="h-4 w-4" />
                <AlertDescription className="text-orange-800">
                  Sin conexión a internet. Verifica tu conexión e intenta de nuevo.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Button onClick={() => fetchData(selectedDate)} className="w-full" disabled={!isOnline}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reintentar
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/despacho">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <style>{styles}</style>
      <header className="header-bg py-4 px-4 sm:px-6 lg:px-8 shadow-md sticky top-0 z-40">
        <div className="flex justify-between items-center text-white">
          <div className="flex items-center space-x-3">
            <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Link href="/despacho">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <p className="text-lg font-semibold header-text">
                {user?.name} {user?.lastname}
              </p>
              <p className="text-sm header-text/80">{user?.role}</p>
            </div>
          </div>

          <div className="flex flex-col items-end text-right">
            {currentTruck ? (
              <>
                <div className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-green-300" />
                  <span className="font-semibold text-white">{currentTruck.placa}</span>
                </div>
                <div className="text-xs text-white/80">
                  Combustible: {Number(currentTruck.currentLoad || 0).toFixed(0)} /{" "}
                  {Number(currentTruck.capacitygal || currentTruck.capacidad).toFixed(0)} gal
                </div>
              </>
            ) : (
              <span className="text-sm text-white/70">Sin camión asignado</span>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className={`text-xs ${currentLocation?.lat ? "bg-green-500" : gpsPermissionDenied ? "bg-red-500" : "bg-yellow-500"} text-white`}
              >
                <MapPin className="h-3 w-3 mr-1" />
                GPS {currentLocation?.lat ? "Activo" : gpsPermissionDenied ? "Denegado" : "Buscando"}
              </Badge>
              <Badge className={`text-xs ${isOnline ? "bg-green-500" : "bg-red-500"} text-white`}>
                {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-2 border-t border-white/20">
          <div className="flex items-center space-x-2 text-white/90 text-sm">
            <Calendar className="h-4 w-4" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-auto bg-white/10 border-white/30 text-white text-sm px-2 py-1 rounded"
            />
          </div>
          <div className="flex items-center space-x-2 text-white/90 text-sm">
            <Clock className="h-4 w-4" />
            <span>{format(currentTime, "HH:mm:ss", { locale: es })}</span>
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 ml-2"
              disabled={isRefreshing || !isOnline}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {!isOnline && (
          <Alert className="mt-3 border-orange-400 bg-orange-50/10 text-white">
            <WifiOff className="h-4 w-4 text-orange-300" />
            <AlertDescription className="text-orange-200">
              Modo offline - Los datos pueden no estar actualizados
            </AlertDescription>
          </Alert>
        )}

        {gpsPermissionDenied && (
          <Alert className="mt-3 border-yellow-400 bg-yellow-50/10 text-white">
            <MapPin className="h-4 w-4 text-yellow-300" />
            <AlertDescription className="text-yellow-200">
              GPS desactivado - Habilita el GPS para funciones de ubicación
            </AlertDescription>
          </Alert>
        )}
      </header>

      <main className="flex-1 overflow-auto max-w-xl mx-auto w-full px-4 py-6">
        <Tabs defaultValue="despachos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="despachos" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Despachos
            </TabsTrigger>
            <TabsTrigger value="fotos" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Fotos
            </TabsTrigger>
            <TabsTrigger value="ubicacion" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Ubicación
            </TabsTrigger>
          </TabsList>

          {/* Despachos Tab */}
          <TabsContent value="despachos" className="space-y-6">
            {assignments.length === 0 ? (
              <Card className="text-center p-6 bg-white shadow rounded-lg animate-slideIn">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isToday
                    ? "No hay despachos activos para hoy"
                    : `No hay despachos para ${format(new Date(selectedDate), "dd/MM/yyyy", { locale: es })}`}
                </h3>
                <p className="text-gray-600">
                  {isToday
                    ? "Los despachos aparecerán cuando el administrador te asigne uno."
                    : "No se encontraron despachos para esta fecha."}
                </p>
                {!isOnline && (
                  <Alert className="mt-4 border-orange-200 bg-orange-50">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                      Sin conexión a internet. Es posible que haya despachos disponibles que no se muestran.
                    </AlertDescription>
                  </Alert>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                {assignments.map((dispatch, index) => (
                  <Card
                    key={dispatch.id}
                    className="shadow-md rounded-lg overflow-hidden animate-slideIn"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CardHeader className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                      <div className="flex justify-between items-center mb-1">
                        <CardTitle className="text-lg font-bold text-blue-800">
                          {dispatch.dispatchNumber || `Asignación #${dispatch.id}`}
                        </CardTitle>
                        {getStatusBadge(dispatch.status)}
                      </div>
                      <CardDescription className="text-sm text-blue-700">
                        {dispatch.customer?.companyname || "Cliente no especificado"} -{" "}
                        {dispatch.fuelType === "PERSONALIZADO"
                          ? dispatch.customFuelName
                          : FUEL_TYPE_LABELS[dispatch.fuelType as FuelType]}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Fuel className="h-4 w-4 text-orange-500" />
                          <span>
                            Cantidad:{" "}
                            <span className="font-semibold">
                              {Number(dispatch.quantity || dispatch.totalLoaded).toFixed(0)} gal
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <MapPin className="h-4 w-4 text-green-500" />
                          <span className="truncate">{dispatch.address || "Sin dirección"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="h-4 w-4 text-purple-500" />
                          <span>
                            Programado:{" "}
                            {dispatch.scheduledDate
                              ? format(new Date(dispatch.scheduledDate), "HH:mm", { locale: es })
                              : "No programado"}
                          </span>
                        </div>
                        {dispatch.deliveredQuantity && (
                          <div className="flex items-center gap-2 text-gray-700">
                            <CheckCircle className="h-4 w-4 text-teal-500" />
                            <span>
                              Entregado:{" "}
                              <span className="font-semibold">{Number(dispatch.deliveredQuantity).toFixed(0)} gal</span>
                            </span>
                          </div>
                        )}
                        {dispatch.completedAt && (
                          <div className="flex items-center gap-2 text-gray-700 col-span-2">
                            <Calendar className="h-4 w-4 text-cyan-500" />
                            <span>
                              Completado: {format(new Date(dispatch.completedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        {dispatch.status === "PROGRAMADO" && (
                          <Button
                            className="flex-1 bg-green-500 hover:bg-green-600"
                            disabled={!isOnline}
                            onClick={async () => {
                              toast({
                                title: "Iniciando carga...",
                                description: `Despacho ${dispatch.dispatchNumber || dispatch.id} en estado "Cargando".`,
                              })
                              try {
                                await axios.put(`/api/dispatches/${dispatch.id}`, { status: "CARGANDO" })
                                fetchData()
                              } catch (error) {
                                console.error("Error updating status:", error)
                                toast({
                                  title: "❌ Error",
                                  description: "No se pudo actualizar el estado.",
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Iniciar Carga
                          </Button>
                        )}
                        {dispatch.status === "CARGANDO" && (
                          <Button
                            className="flex-1 bg-orange-500 hover:bg-orange-600"
                            disabled={!isOnline}
                            onClick={async () => {
                              toast({
                                title: "En Ruta...",
                                description: `Despacho ${dispatch.dispatchNumber || dispatch.id} en estado "En Ruta".`,
                              })
                              try {
                                await axios.put(`/api/dispatches/${dispatch.id}`, { status: "EN_RUTA" })
                                fetchData()
                              } catch (error) {
                                console.error("Error updating status:", error)
                                toast({
                                  title: "❌ Error",
                                  description: "No se pudo actualizar el estado.",
                                  variant: "destructive",
                                })
                              }
                            }}
                          >
                            <Car className="h-4 w-4 mr-2" />
                            En Ruta
                          </Button>
                        )}
                        {dispatch.status === "EN_RUTA" && isToday && (
                          <>
                            <Button
                              className="flex-1 bg-indigo-500 hover:bg-indigo-600"
                              onClick={() => {
                                const lat = dispatch.deliveryLatitude || 0
                                const lng = dispatch.deliveryLongitude || 0
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
                                  "_blank",
                                )
                              }}
                            >
                              <MapPin className="h-4 w-4 mr-2" />
                              Navegación
                            </Button>
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              disabled={!isOnline}
                              onClick={() => openDeliveryModal(dispatch)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Completar
                            </Button>
                          </>
                        )}
                        {dispatch.status === "COMPLETADO" && (
                          <>
                            <Button variant="outline" className="flex-1 bg-transparent">
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Reporte
                            </Button>
                            <Button variant="outline" className="flex-1 bg-transparent">
                              <Share2 className="h-4 w-4 mr-2" />
                              Compartir
                            </Button>
                          </>
                        )}
                      </div>

                      {!isOnline && (
                        <Alert className="mt-2 border-orange-200 bg-orange-50">
                          <WifiOff className="h-4 w-4" />
                          <AlertDescription className="text-orange-800 text-xs">
                            Sin conexión - Los cambios se sincronizarán cuando se restablezca
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Fotos Tab */}
          <TabsContent value="fotos" className="space-y-6">
            <Card className="text-center p-6 bg-white shadow rounded-lg">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center justify-center gap-2">
                  <Camera className="h-6 w-6" />
                  Documentar Despacho
                </CardTitle>
                <CardDescription>Toma fotos de cada etapa del proceso</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {photos.map((photo) => (
                  <Button
                    key={photo.type}
                    variant="outline"
                    className={`h-32 flex flex-col items-center justify-center space-y-2 rounded-lg border-2 ${
                      photo.url
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-300 bg-gray-50 text-gray-600"
                    }`}
                    onClick={() => handlePhotoUploadClick(photo.type)}
                    disabled={isProcessingDelivery}
                  >
                    {photo.url ? (
                      <Check className="h-8 w-8 text-green-600" />
                    ) : (
                      <Camera className="h-8 w-8 text-gray-500" />
                    )}
                    <span className="text-sm font-medium capitalize">{photo.type.replace(/_/g, " ")}</span>
                    {photo.url && <span className="text-xs">{format(new Date(photo.timestamp!), "HH:mm")}</span>}
                  </Button>
                ))}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ubicación Tab */}
          <TabsContent value="ubicacion" className="space-y-6">
            <Card className="p-6 bg-white shadow rounded-lg space-y-4">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <MapPin className="h-5 w-5" />
                {currentLocation?.lat
                  ? "GPS Activo - Ubicación en Tiempo Real"
                  : gpsPermissionDenied
                    ? "GPS Deshabilitado"
                    : "Buscando Ubicación GPS"}
              </CardTitle>
              <div className="space-y-2 text-sm text-gray-700">
                <p className="font-mono bg-blue-50 p-2 rounded-md">
                  Lat: {currentLocation?.lat?.toFixed(4) || "N/A"}° | Lng: {currentLocation?.lng?.toFixed(4) || "N/A"}°
                </p>
                <p>
                  Alt: {currentLocation?.altitude?.toFixed(0) || "N/A"}m | Precisión: ±
                  {currentLocation?.accuracy?.toFixed(0) || "N/A"}m
                </p>
                <p className="font-semibold mt-2">Dirección actual:</p>
                <p>
                  {currentLocation?.address ||
                    (gpsPermissionDenied ? "GPS deshabilitado por el usuario" : "Obteniendo ubicación...")}
                </p>
              </div>

              {gpsPermissionDenied && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Para habilitar el GPS, ve a la configuración de tu navegador y permite el acceso a la ubicación para
                    este sitio.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={!currentLocation?.lat}
                  onClick={() => {
                    if (currentLocation?.lat && currentLocation?.lng) {
                      if (navigator.share) {
                        navigator
                          .share({
                            title: "Mi Ubicación Actual",
                            text: `Estoy en Lat: ${currentLocation.lat.toFixed(4)}, Lng: ${currentLocation.lng.toFixed(4)}.`,
                            url: `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`,
                          })
                          .then(() =>
                            toast({ title: "Ubicación Compartida", description: "Tu ubicación ha sido compartida." }),
                          )
                          .catch((error) => console.error("Error sharing", error))
                      } else {
                        toast({
                          title: "Compartir No Disponible",
                          description: "La función de compartir no está disponible en este dispositivo.",
                        })
                      }
                    }
                  }}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartir Ubicación
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 bg-transparent"
                  disabled={!currentLocation?.lat}
                  onClick={() => {
                    if (currentLocation?.lat && currentLocation?.lng) {
                      window.open(
                        `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`,
                        "_blank",
                      )
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Ver Mapa
                </Button>
              </div>
            </Card>

            {/* Ruta de Hoy - Mejorada con datos reales */}
            <Card className="route-card p-6 text-white shadow-lg rounded-lg space-y-4">
              <CardTitle className="flex items-center gap-2 text-white">
                <Route className="h-5 w-5" />
                Ruta de Hoy
              </CardTitle>

              {/* Estadísticas principales */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Navigation className="h-4 w-4 text-blue-200" />
                    <p className="text-sm text-blue-100">Distancia Recorrida</p>
                  </div>
                  <p className="font-bold text-xl text-white">{routeData.totalDistance.toFixed(1)} km</p>
                </div>

                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Timer className="h-4 w-4 text-green-200" />
                    <p className="text-sm text-green-100">Tiempo en Ruta</p>
                  </div>
                  <p className="font-bold text-xl text-white">{formatTime(routeData.totalTime)}</p>
                </div>

                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-yellow-200" />
                    <p className="text-sm text-yellow-100">Paradas Realizadas</p>
                  </div>
                  <p className="font-bold text-xl text-white">
                    {routeData.completedStops} de {routeData.totalStops}
                  </p>
                </div>

                <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-purple-200" />
                    <p className="text-sm text-purple-100">Velocidad Promedio</p>
                  </div>
                  <p className="font-bold text-xl text-white">{routeData.averageSpeed.toFixed(1)} km/h</p>
                </div>
              </div>

              {/* Distancia y tiempo a la próxima parada */}
              {routeData.nextStopAddress && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-cyan-200" />
                      <p className="text-sm text-cyan-100">Próxima Parada</p>
                    </div>
                    <p className="font-bold text-md text-white truncate">{routeData.nextStopAddress}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-pink-200" />
                      <p className="text-sm text-pink-100">Distancia / Tiempo Est.</p>
                    </div>
                    <p className="font-bold text-md text-white">
                      {routeData.distanceToNextStop.toFixed(1)} km / {formatTime(routeData.estimatedTimeToNextStop)}
                    </p>
                  </div>
                </div>
              )}

              {/* Progreso de la ruta */}
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-white/90">Progreso de entregas</span>
                  <span className="text-sm font-semibold text-white">{routeData.routeEfficiency.toFixed(0)}%</span>
                </div>
                <Progress value={routeData.routeEfficiency} className="h-2 bg-white/20" />
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span>Inicio</span>
                  <span>Completado</span>
                </div>
              </div>

              {/* Información adicional */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-200" />
                  <span className="text-white/90">
                    Velocidad actual: <span className="font-semibold">{routeData.currentSpeed.toFixed(1)} km/h</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-red-200" />
                  <span className="text-white/90">
                    Combustible usado (est.):{" "}
                    <span className="font-semibold">{routeData.fuelConsumed.toFixed(1)}L</span>
                  </span>
                </div>
              </div>

              {/* Última actualización */}
              <div className="text-xs text-white/60 text-center pt-2 border-t border-white/20">
                Última actualización: {format(routeData.lastLocationUpdate, "HH:mm:ss", { locale: es })}
              </div>
            </Card>

            <Alert className="border-orange-400 bg-orange-50 text-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-900">Importante</AlertTitle>
              <AlertDescription className="text-orange-800">
                Mantén el GPS activado durante todo el recorrido para el seguimiento en tiempo real.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>
      </main>

      {/* Floating Emergency Button */}
      <Button
        variant="destructive"
        size="lg"
        className="fixed bottom-4 right-4 rounded-full p-4 shadow-lg animate-pulse-once z-50"
        onClick={() => setIsEmergencyModalOpen(true)}
      >
        <BellRing className="h-6 w-6" />
        <span className="sr-only">Emergencia</span>
      </Button>

      {/* Delivery Completion Modal */}
      {isDeliveryModalOpen && selectedDispatchForCompletion && (
        <Dialog open={isDeliveryModalOpen} onOpenChange={setIsDeliveryModalOpen}>
          <DialogContent className="max-w-md w-full p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">Completar Entrega</DialogTitle>
              <DialogDescription>
                <span className="font-semibold">
                  {selectedDispatchForCompletion.customer?.companyname || "Cliente no especificado"}
                </span>{" "}
                - {selectedDispatchForCompletion.dispatchNumber || `Asignación #${selectedDispatchForCompletion.id}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!isOnline && (
                <Alert className="border-red-200 bg-red-50">
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription className="text-red-800">
                    Sin conexión a internet. No se puede completar la entrega en este momento.
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Cantidad asignada:
                  <span className="font-bold ml-1">
                    {Number(
                      selectedDispatchForCompletion.quantity || selectedDispatchForCompletion.totalLoaded,
                    ).toFixed(2)}{" "}
                    gal
                  </span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Dirección: {selectedDispatchForCompletion.address || "N/A"}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Tipo Combustible:{" "}
                  {selectedDispatchForCompletion.fuelType === "PERSONALIZADO"
                    ? selectedDispatchForCompletion.customFuelName
                    : FUEL_TYPE_LABELS[selectedDispatchForCompletion.fuelType as FuelType]}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marcadorInicial">Combustible Disponible en el Camión (Galones)</Label>
                <Input
                  id="marcadorInicial"
                  type="number"
                  step="0.01"
                  value={marcadorInicial}
                  onChange={(e) => setMarcadorInicial(e.target.value)}
                  placeholder="Ej: 2500.00"
                  className="focus:ring-2 focus:ring-blue-500"
                  disabled={!isOnline}
                />
                <p className="text-xs text-gray-500">
                  Galones de combustible restantes en el camión antes de la entrega
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marcadorFinal">Cantidad Entregada al Cliente (Galones)</Label>
                <Input
                  id="marcadorFinal"
                  type="number"
                  step="0.01"
                  value={marcadorFinal}
                  onChange={(e) => setMarcadorFinal(e.target.value)}
                  placeholder="Ej: 500.00"
                  className="focus:ring-2 focus:ring-blue-500"
                  disabled={!isOnline}
                />
                <p className="text-xs text-gray-500">Galones de combustible entregados al cliente</p>
              </div>

              {marcadorInicial && marcadorFinal && (
                <div className={`p-4 rounded-lg ${calculateDeliveredAmount2() > 0 ? "bg-green-50" : "bg-red-50"}`}>
                  <Label className={`text-sm ${calculateDeliveredAmount2() > 0 ? "text-green-700" : "text-red-700"}`}>
                    Cantidad a registrar como entregada:
                  </Label>
                  <p
                    className={`font-bold text-xl ${calculateDeliveredAmount2() > 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    {calculateDeliveredAmount2().toFixed(2)} gal
                  </p>

                  {calculateDeliveredAmount2() > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-green-600">
                        Diferencia con lo asignado: {(() => {
                          const assignedQty = Number(
                            selectedDispatchForCompletion.quantity || selectedDispatchForCompletion.totalLoaded,
                          )
                          const difference = Math.abs(calculateDeliveredAmount2() - assignedQty)
                          if (difference < 0.01) {
                            return "0.00 gal (cantidad exacta)"
                          } else {
                            return `${difference.toFixed(2)} gal ${calculateDeliveredAmount2() > assignedQty ? "(entregando más)" : "(entregando menos)"}`
                          }
                        })()}
                      </p>
                      <p className="text-xs text-blue-600">
                        Combustible restante en camión después de esta entrega:{" "}
                        {(Number.parseFloat(marcadorInicial) - calculateDeliveredAmount2()).toFixed(2)} gal
                      </p>
                    </div>
                  )}

                  {calculateDeliveredAmount2() <= 0 && (
                    <p className="text-xs text-red-600 mt-1">La cantidad entregada debe ser mayor a 0</p>
                  )}
                  {Number.parseFloat(marcadorFinal) > Number.parseFloat(marcadorInicial) && (
                    <p className="text-xs text-red-600 mt-1">
                      No se puede entregar más combustible del disponible en el camión
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
              <Button
                onClick={completeDispatchDelivery}
                disabled={
                  isProcessingDelivery ||
                  !isOnline ||
                  !marcadorInicial ||
                  !marcadorFinal ||
                  calculateDeliveredAmount2() <= 0 ||
                  Number.parseFloat(marcadorFinal) > Number.parseFloat(marcadorInicial) + 0.01
                }
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-200"
              >
                {isProcessingDelivery ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Completando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Completar Entrega
                  </>
                )}
              </Button>
              <Button
                onClick={closeDeliveryModal}
                variant="outline"
                className="w-full hover:bg-gray-100 bg-transparent"
                disabled={isProcessingDelivery}
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Emergency Modal */}
      <Dialog open={isEmergencyModalOpen} onOpenChange={setIsEmergencyModalOpen}>
        <DialogContent className="max-w-md w-full p-6">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Reportar Incidencia / Emergencia
            </DialogTitle>
            <DialogDescription>
              Describe brevemente la situación para que el equipo de soporte pueda asistirte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyNotes">Descripción de la Incidencia</Label>
              <Textarea
                id="emergencyNotes"
                placeholder="Ej: Neumático pinchado en el Km 120 de la carretera central..."
                value={emergencyNotes}
                onChange={(e) => setEmergencyNotes(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </div>
            {currentLocation && (
              <Alert className="bg-blue-50 border-blue-200">
                <MapPin className="h-4 w-4" />
                <AlertDescription>
                  Tu ubicación actual: Lat: {currentLocation.lat?.toFixed(4)}, Lng: {currentLocation.lng?.toFixed(4)}
                </AlertDescription>
              </Alert>
            )}
            {!isOnline && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <WifiOff className="h-4 w-4" />
                <AlertDescription>
                  Sin conexión a internet. El reporte se enviará cuando se restablezca la conexión.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2 pt-4">
            <Button
              onClick={handleEmergencySubmit}
              disabled={isSendingEmergency}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isSendingEmergency ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <BellRing className="h-4 w-4 mr-2" />
                  {isOnline ? "Enviar Reporte" : "Guardar Reporte (Envío Pendiente)"}
                </>
              )}
            </Button>
            <Button
              onClick={() => setIsEmergencyModalOpen(false)}
              variant="outline"
              className="w-full hover:bg-gray-100"
              disabled={isSendingEmergency}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
