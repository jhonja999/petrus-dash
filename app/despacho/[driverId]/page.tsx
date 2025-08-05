"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AssignmentImageGallery } from "@/components/AssignmentImageGallery"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AssignmentCard } from "@/components/AssignmentCard"
import { AssignmentForm } from "@/components/AssignmentForm"
import { ClientAssignmentForm } from "@/components/ClientAssignmentForm"
import { DynamicTruckCard } from "@/components/DynamicTruckCard"
import { LocationDisplay } from "@/components/LocationDisplay"
import { MobileDispatchCard } from "@/components/MobileDispatchCard"
import { StatusIndicator } from "@/components/StatusIndicator"
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
  Navigation,
  Camera,
  Upload,
  Download,
  ImageIcon,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
  Eye,
  EyeOff,
} from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import { CloudinaryUpload } from "@/components/CloudinaryUpload"

// Cloudinary Upload Widget types
import type { CloudinaryUploadOptions, CloudinaryWidget } from "@/components/CloudinaryUpload"
declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: CloudinaryUploadOptions,
        callback: (error: any, result: any) => void
      ) => CloudinaryWidget
    }
  }
}

// Estilos para animaciones
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .animate-slideDown {
    animation: slideDown 0.4s ease-out;
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
  }
  clientAssignments?: ClientAssignment[]
}

interface AssignmentImage {
  id: number
  assignmentId: number
  type: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  uploadedBy: number
  url: string
  createdAt: string
  uploadedByUser?: {
    id: number
    name: string
    lastname: string
  }
}

// ✅ Función de sincronización para día actual
const syncOperatorData = async (driverId: string) => {
  try {
    console.log("🔄 Iniciando sincronización de datos del operador...")

    // 1. Auto-completar asignaciones antiguas
    await axios.post("/api/assignments/auto-complete", { driverId: Number(driverId) })

    // 2. Sincronizar datos del operador
    await axios.post("/api/assignments/sync-operator", { driverId: Number(driverId) })

    console.log("✅ Sincronización completada")
    return true
  } catch (error) {
    console.error("❌ Error en sincronización:", error)
    return false
  }
}

export default function DespachoDriverPage() {
  const [modalGalleryKey, setModalGalleryKey] = useState(0)
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
  const [showCompleted, setShowCompleted] = useState(false)

  // Estados para el registro de entrega (sin modal)
  const [selectedClientAssignment, setSelectedClientAssignment] = useState<ClientAssignment | null>(null)
  const [marcadorInicial, setMarcadorInicial] = useState("0.00")
  const [marcadorFinal, setMarcadorFinal] = useState("0.00")
  const [isProcessing, setIsProcessing] = useState(false)
  const [deliveryImages, setDeliveryImages] = useState<{
    start: AssignmentImage[]
    unloading: AssignmentImage[]
  }>({
    start: [],
    unloading: []
  })

  // Estados para tracking de ubicación
  const [isLocationSharing, setIsLocationSharing] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Estados para completar entrega con evidencia
  const [deliveryEvidence, setDeliveryEvidence] = useState<{
    [key: string]: {
      quantity: string
      isComplete: boolean
      images: string[]
    }
  }>({})

  // Utility functions and computations
  const isToday = selectedDate === new Date().toISOString().split("T")[0]

  const getAllPendingDeliveries = () => {
    return assignments.reduce<ClientAssignment[]>((acc, assignment) => {
      const pendingDeliveries = assignment.clientAssignments?.filter(ca => ca.status === "pending") || []
      return [...acc, ...pendingDeliveries]
    }, [])
  }

  const getAllCompletedDeliveries = () => {
    return assignments.reduce<ClientAssignment[]>((acc, assignment) => {
      const completedDeliveries = assignment.clientAssignments?.filter(ca => ca.status === "completed") || []
      return [...acc, ...completedDeliveries]
    }, [])
  }

  const pendingDeliveries = getAllPendingDeliveries()
  const completedDeliveries = getAllCompletedDeliveries()

  // Basic auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  // Actualizar marcadores cuando cambia la cantidad entregada
  useEffect(() => {
    if (!selectedClientAssignment) return

    const deliveredQuantity = deliveryEvidence[selectedClientAssignment.id]?.quantity
    if (deliveredQuantity) {
      const cantidad = Number(deliveredQuantity)
      setMarcadorInicial("0.00")
      setMarcadorFinal(cantidad.toFixed(2))
    }
  }, [selectedClientAssignment, deliveryEvidence])

  // Reset de estados al seleccionar/deseleccionar entrega
  useEffect(() => {
    if (selectedClientAssignment) {
      const cantidad = Number(selectedClientAssignment.allocatedQuantity)
      setMarcadorInicial("0.00")
      setMarcadorFinal(cantidad.toFixed(2))
      setDeliveryEvidence(prev => ({
        ...prev,
        [selectedClientAssignment.id]: {
          quantity: cantidad.toString(),
          isComplete: false,
          images: prev[selectedClientAssignment.id]?.images || []
        }
      }))
    } else {
      setMarcadorInicial("0.00")
      setMarcadorFinal("0.00")
      setDeliveryImages({ start: [], unloading: [] })
    }
  }, [selectedClientAssignment])

  // Reset estados al cambiar fecha
  useEffect(() => {
    setIsProcessing(false)
    setSelectedClientAssignment(null)
    setIsLocationSharing(false)
    setShowCompleted(false)
  }, [selectedDate])

  // Cleanup al desmontar componente
  useEffect(() => {
    return () => {
      setIsProcessing(false)
      setIsRefreshing(false)
      setIsLocationSharing(false)
    }
  }, [])

  // ✅ Cargar asignaciones y entregas históricas
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true)
      setError(null)

      try {
        const today = new Date().toISOString().split("T")[0]
        let res

        // ✅ Si es HOY, obtener TODAS las asignaciones ACTIVAS
        if (selectedDate === today) {
          console.log("📊 Fetching ACTIVE assignments (not filtered by date)")
          res = await axios.get(`/api/assignments/active?driverId=${driverId}`)
        } else {
          // Si es una fecha específica del pasado, filtrar por esa fecha
          console.log(`📊 Fetching assignments for specific date: ${selectedDate}`)
          res = await axios.get(`/api/assignments/dashboard?driverId=${driverId}&date=${selectedDate}`)
        }

        setAssignments(res.data.assignments || res.data)
        setLastRefresh(new Date())

        // ✅ Mostrar entregas completadas automáticamente si no hay pendientes
        const allAssignments = res.data.assignments || res.data
        const hasPending = allAssignments.some((assignment: ExtendedAssignment) => 
          assignment.clientAssignments?.some(ca => ca.status === "pending")
        )
        if (!hasPending && selectedDate === today) {
          setShowCompleted(true)
        }

      } catch (err) {
        console.error("❌ Error loading assignments:", err)
        setError("Error al cargar las asignaciones. Inténtalo de nuevo más tarde.")
      } finally {
        setLoading(false)
      }
    }

    if (driverId) {
      fetchAssignments()
    }
  }, [driverId, selectedDate, isRefreshing])

  // Handler para compartir ubicación
  const handleLocationShare = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Tu navegador no soporta geolocalización",
        variant: "destructive"
      })
      return
    }

    setIsLocationSharing(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })
      
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      }
      setCurrentLocation(newLocation)

      await axios.post(`/api/despacho/${driverId}/location`, {
        latitude: newLocation.lat,
        longitude: newLocation.lng,
        timestamp: new Date().toISOString()
      })

      toast({
        title: "✅ Ubicación compartida",
        description: "Tu ubicación ha sido actualizada"
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo obtener tu ubicación",
        variant: "destructive"
      })
    } finally {
      setIsLocationSharing(false)
    }
  }

  // Handler para refrescar datos
  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Timeout de seguridad para evitar estados colgados
    const timeoutId = setTimeout(() => {
      setIsRefreshing(false)
      toast({
        title: "⏰ Timeout",
        description: "La actualización tardó demasiado y fue cancelada",
        variant: "destructive"
      })
    }, 30000) // 30 segundos

    try {
      // ✅ Sincronizar datos del operador si es día actual
      const today = new Date().toISOString().split("T")[0]
      if (selectedDate === today) {
        await axios.post(`/api/assignments/sync-operator`, { driverId: Number(driverId) })
      }

      // ✅ Obtener asignaciones con endpoint correcto
      let res
      if (selectedDate === today) {
        res = await axios.get(`/api/assignments/active?driverId=${driverId}`)
      } else {
        res = await axios.get(`/api/assignments/dashboard?driverId=${driverId}&date=${selectedDate}`)
      }

      clearTimeout(timeoutId)
      setAssignments(res.data.assignments || res.data)
      setLastRefresh(new Date())
      
      toast({
        title: "✅ Datos actualizados",
        description: "Los datos han sido sincronizados correctamente"
      })
    } catch (err) {
      clearTimeout(timeoutId)
      console.error("❌ Error refreshing data:", err)
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Helper function for assignment completion
  const completeDelivery = async (clientAssignment: ClientAssignment) => {
    if (!clientAssignment || !deliveryEvidence[clientAssignment.id]) {
      toast({
        title: "Error",
        description: "Debes ingresar la cantidad entregada",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    
    // Timeout de seguridad para evitar estados colgados
    const timeoutId = setTimeout(() => {
      setIsProcessing(false)
      toast({
        title: "⏰ Timeout",
        description: "La operación tardó demasiado y fue cancelada",
        variant: "destructive"
      })
    }, 30000) // 30 segundos

    try {
      // ✅ Usar endpoint correcto para completar entrega del cliente
      const response = await axios.put(
        `/api/assignments/${clientAssignment.assignmentId}/clients/${clientAssignment.id}`,
        {
          status: "completed",
          deliveredQuantity: deliveryEvidence[clientAssignment.id].quantity,
          allocatedQuantity: clientAssignment.allocatedQuantity,
          marcadorInicial: marcadorInicial,
          marcadorFinal: marcadorFinal,
        }
      )

      clearTimeout(timeoutId)

      console.log("✅ Entrega completada con éxito:", response.data)

      toast({
        title: "✅ Entrega completada",
        description: `${clientAssignment.customer.companyname} - ${Number(deliveryEvidence[clientAssignment.id].quantity).toFixed(2)} galones entregados`,
        className: "border-green-200 bg-green-50"
      })

      // Limpiar estados
      setDeliveryEvidence(prev => {
        const newState = { ...prev }
        delete newState[clientAssignment.id]
        return newState
      })
      
      setSelectedClientAssignment(null)
      
      // ✅ Sincronizar datos después de completar entrega
      const today = new Date().toISOString().split("T")[0]
      if (selectedDate === today) {
        const syncSuccess = await syncOperatorData(driverId)
        if (syncSuccess) {
          toast({
            title: "🔄 Datos sincronizados",
            description: "Los dashboards han sido actualizados automáticamente.",
            className: "border-green-200 bg-green-50",
          })
        }
      }

      // ✅ Mostrar completadas automáticamente si no hay más pendientes
      setTimeout(() => {
        const remainingPending = assignments.reduce((count, assignment) => {
          const pending = assignment.clientAssignments?.filter(ca => 
            ca.status === "pending" && ca.id !== clientAssignment.id
          ).length || 0
          return count + pending
        }, 0)
        
        if (remainingPending === 0) {
          setShowCompleted(true)
          toast({
            title: "🎉 ¡Todas las entregas completadas!",
            description: "Mostrando el historial de entregas del día",
            className: "border-blue-200 bg-blue-50"
          })
        }
      }, 1000)

      // Refrescar los datos
      handleRefresh()
    } catch (err: any) {
      clearTimeout(timeoutId)
      console.error("❌ Error completing assignment:", err)

      let errorMessage = "Error al completar la entrega"
      if (axios.isAxiosError(err)) {
        if (err.response?.data?.error) {
          errorMessage = err.response.data.error
        } else if (err.response?.data?.details) {
          errorMessage = `${err.response.data.error}: ${err.response.data.details}`
        }
        console.error("❌ Full error response:", err.response?.data)
      }

      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const completeAssignment = async (assignmentId: number) => {
    try {
      const assignment = assignments.find(a => a.id === assignmentId)
      if (!assignment) return

      const pendingDeliveries = assignment.clientAssignments?.filter(ca => ca.status === "pending")
      if (pendingDeliveries && pendingDeliveries.length > 0) {
        toast({
          title: "⚠️ Advertencia",
          description: "Debes completar todas las entregas antes de finalizar la asignación",
          variant: "destructive"
        })
        return
      }

      await axios.post(`/api/assignments/${assignmentId}/complete`, {
        totalRemaining: assignment.totalRemaining
      })
      
      toast({
        title: "✅ Asignación completada",
        description: `La asignación #${assignmentId} ha sido completada exitosamente.`,
        className: "border-green-200 bg-green-50"
      })
      handleRefresh()
    } catch (err: any) {
      toast({
        title: "❌ Error",
        description: err?.response?.data?.error || "No se pudo completar la asignación.",
        variant: "destructive"
      })
    }
  }

  // Función para cerrar el formulario de entrega
  const closeDeliveryForm = () => {
    setSelectedClientAssignment(null)
    setMarcadorInicial("0.00")
    setMarcadorFinal("0.00")
    setDeliveryImages({ start: [], unloading: [] })
    setIsProcessing(false) // Reset estado de procesamiento
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando panel del conductor...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{styles}</style>
      
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Panel del Conductor</h1>
              <p className="text-sm text-gray-500">
                {user?.name} {user?.lastname}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-4">
             
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isToday && (
                <Button variant="outline" onClick={handleLocationShare} disabled={isLocationSharing} className="flex-1 sm:flex-none">
                  <Navigation className="h-4 w-4 mr-2" />
                  {isLocationSharing ? "Compartiendo..." : "Compartir Ubicación"}
                </Button>
              )}

              <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="flex-1 sm:flex-none">
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Indicador de estado global */}
        {(isProcessing || isRefreshing || isLocationSharing) && (
          <div className="mb-6">
            <Alert className="bg-yellow-50 border-yellow-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                {isProcessing && "Procesando entrega..."}
                {isRefreshing && "Actualizando datos..."}
                {isLocationSharing && "Obteniendo ubicación..."}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Panel de tracking de ubicación */}
        {isToday && currentLocation && (
          <div className="mb-6">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2 text-green-800">
                  <Navigation className="h-5 w-5" />
                  Ubicación Actual
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-700">Latitud</Label>
                    <p className="font-mono text-green-900">{currentLocation.lat.toFixed(6)}</p>
                  </div>
                  <div>
                    <Label className="text-green-700">Longitud</Label>
                    <p className="font-mono text-green-900">{currentLocation.lng.toFixed(6)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deliveries" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Entregas ({pendingDeliveries.length} pendientes / {completedDeliveries.length} completadas)
            </TabsTrigger>
            <TabsTrigger value="assignments" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Detalles de Asignaciones ({assignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-8">
            {assignments.length === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isToday ? "No hay asignaciones para hoy" : "No hay asignaciones para esta fecha"}
                  </h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {assignments.map((assignment) => (
                  <Card key={assignment.id} className="bg-white rounded-lg shadow">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <CardTitle className="text-xl">{`Asignación #${assignment.id}`}</CardTitle>
                          <CardDescription className="mt-1">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              {`${assignment.truck.placa} - ${assignment.fuelType}`}
                            </div>
                          </CardDescription>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={`w-full sm:w-auto text-center ${
                            assignment.isCompleted 
                              ? "bg-green-100 text-green-800 hover:bg-green-100" 
                              : "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                          }`}
                        >
                          {assignment.isCompleted ? "Completada" : "Pendiente"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Estado de Entregas</Label>
                        <div className="mt-2 space-y-2">
                          {assignment.clientAssignments?.map((ca) => (
                            <div key={ca.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                              <div className="flex-1">
                                <p className="font-medium">{ca.customer.companyname}</p>
                                <p className="text-sm text-gray-500">
                                  {Number(ca.allocatedQuantity).toFixed(2)} gal
                                  {ca.status === "completed" && ca.deliveredQuantity && (
                                    <span className="text-green-600 ml-2">
                                      → {Number(ca.deliveredQuantity).toFixed(2)} gal entregados
                                    </span>
                                  )}
                                </p>
                              </div>
                              <Badge 
                                variant="secondary"
                                className={
                                  ca.status === "completed" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {ca.status === "completed" ? "Completado" : "Pendiente"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Progreso General</Label>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1">
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div 
                                className={`h-2 rounded-full ${assignment.isCompleted ? "bg-green-500" : "bg-blue-500"}`}
                                style={{ width: `${(Number(assignment.totalLoaded) - Number(assignment.totalRemaining)) / Number(assignment.totalLoaded) * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {Number(assignment.totalLoaded).toFixed(2)} gal
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 text-xs text-gray-500 border-t">
                        <p>
                          Última actualización: {lastRefresh && lastRefresh.toLocaleTimeString()}
                        </p>
                        <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="deliveries" className="space-y-8">
            {/* Botón para mostrar/ocultar entregas completadas */}
            {completedDeliveries.length > 0 && (
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Entregas del día</h3>
                <Button
                  variant="outline"
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2"
                >
                  {showCompleted ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showCompleted ? "Ocultar completadas" : "Mostrar completadas"}
                  <Badge variant="secondary" className="ml-2">
                    {completedDeliveries.length}
                  </Badge>
                </Button>
              </div>
            )}

            {/* Entregas Pendientes */}
            {pendingDeliveries.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-yellow-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Entregas Pendientes ({pendingDeliveries.length})
                </h4>
                <div className="space-y-6">
                  {pendingDeliveries.map((clientAssignment) => (
                    <Card key={`${clientAssignment.assignmentId}-${clientAssignment.id}`} className="group hover:shadow-lg transition-shadow border-yellow-200">
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {clientAssignment.customer.companyname}
                            </CardTitle>
                            <CardDescription>
                              <div className="space-y-1 mt-2">
                                <p className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  RUC: {clientAssignment.customer.ruc}
                                </p>
                                {clientAssignment.customer.address && (
                                  <p className="flex items-center gap-2 text-xs">
                                    <MapPin className="h-3 w-3" />
                                    {clientAssignment.customer.address}
                                  </p>
                                )}
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                              {Number(clientAssignment.allocatedQuantity).toFixed(2)} gal
                            </Badge>
                            <p className="text-xs text-gray-500">
                              Asignación #{clientAssignment.assignmentId}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <StatusIndicator 
                              isRefreshing={isRefreshing}
                              lastRefresh={lastRefresh}
                              variant="dot"
                            />
                            {isToday && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    if (navigator.share) {
                                      navigator.share({
                                        title: `Entrega a ${clientAssignment.customer.companyname}`,
                                        text: `${clientAssignment.customer.address}`,
                                        url: `https://maps.google.com/?q=${encodeURIComponent(clientAssignment.customer.address || '')}`
                                      })
                                    }
                                  }}
                                >
                                  <MapPin className="h-4 w-4 mr-2" />
                                  Ver Ubicación
                                </Button>
                                <Button
                                  variant={selectedClientAssignment?.id === clientAssignment.id ? "destructive" : "default"}
                                  size="sm"
                                  onClick={() => {
                                    if (selectedClientAssignment?.id === clientAssignment.id) {
                                      closeDeliveryForm()
                                    } else {
                                      setSelectedClientAssignment(clientAssignment)
                                    }
                                  }}
                                  className="group-hover:animate-pulse"
                                >
                                  {selectedClientAssignment?.id === clientAssignment.id ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-2" />
                                      Cerrar Formulario
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-2" />
                                      Registrar Entrega
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>

                      {/* Formulario de Registro de Entrega Expandible */}
                      {selectedClientAssignment?.id === clientAssignment.id && (
                        <div className="border-t border-gray-200 bg-gray-50 animate-slideDown">
                          <div className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="text-xl font-bold text-blue-800">📋 Registrar Entrega</h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={closeDeliveryForm}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                            </div>
            
                            {selectedClientAssignment && (
                              <div className="space-y-6">
                                {/* Información del Cliente */}
                                <div className="bg-blue-50 p-6 rounded-lg space-y-3 border border-blue-200">
                                  <h4 className="text-xl font-semibold text-blue-900">{selectedClientAssignment.customer.companyname}</h4>
                                  <div className="flex flex-col gap-2">
                                    <p className="text-sm text-blue-700 flex items-center gap-2.5">
                                      <FileText className="h-4.5 w-4.5" />
                                      <span className="font-medium">RUC:</span> {selectedClientAssignment.customer.ruc}
                                    </p>
                                    {selectedClientAssignment.customer.address && (
                                      <p className="text-sm text-blue-700 flex items-start gap-2.5">
                                        <MapPin className="h-4.5 w-4.5 mt-0.5 flex-shrink-0" />
                                        <span className="flex-1"><span className="font-medium">Dirección:</span> {selectedClientAssignment.customer.address}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Cantidades y Marcadores */}
                                <div className="space-y-6 bg-white rounded-lg p-4 border border-gray-200">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-gray-600">Cantidad Asignada</Label>
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-blue-600">
                                          {Number(selectedClientAssignment.allocatedQuantity).toFixed(2)}
                                        </span>
                                        <span className="text-sm text-gray-500">gal</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium text-gray-600">Cantidad a Entregar</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="text-2xl h-12 font-medium text-gray-900"
                                        value={
                                          deliveryEvidence[selectedClientAssignment.id]?.quantity || 
                                          selectedClientAssignment.allocatedQuantity || 
                                          "0.00"
                                        }
                                        onChange={(e) => {
                                          const value = e.target.value
                                          const numValue = Number(value)
                                          const maxValue = Number(selectedClientAssignment.allocatedQuantity)
                                          
                                          if (numValue > maxValue) {
                                            toast({
                                              title: "⚠️ Advertencia",
                                              description: "La cantidad no puede ser mayor a la asignada",
                                              variant: "destructive"
                                            })
                                            return
                                          }

                                          setDeliveryEvidence(prev => ({
                                            ...prev,
                                            [selectedClientAssignment.id]: {
                                              ...prev[selectedClientAssignment.id],
                                              quantity: value,
                                              isComplete: false,
                                              images: prev[selectedClientAssignment.id]?.images || []
                                            }
                                          }))
                                        }}
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-gray-200">
                                    <div className="space-y-2">
                                      <Label className="text-sm text-gray-600 flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Marcador Inicial
                                      </Label>
                                      <div className="text-2xl font-semibold text-gray-900 flex items-baseline gap-2">
                                        {marcadorInicial}
                                        <span className="text-sm text-gray-500">gal</span>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-sm text-gray-600 flex items-center gap-2">
                                        <Target className="h-4 w-4" />
                                        Marcador Final
                                      </Label>
                                      <div className="text-2xl font-semibold text-gray-900 flex items-baseline gap-2">
                                        {marcadorFinal}
                                        <span className="text-sm text-gray-500">gal</span>
                                      </div>
                                      <p className="text-sm text-gray-500 flex items-center gap-2">
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Cálculo automático según cantidad
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Evidencias */}
                                <div className="space-y-6">
                                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <Camera className="h-5 w-5 text-blue-600" />
                                    Evidencias Fotográficas
                                  </h3>
                                  <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                      <Label className="flex items-center gap-2 mb-3 text-blue-700">
                                        <Upload className="h-4 w-4" />
                                        <span className="font-medium">Evidencia de Inicio</span>
                                      </Label>
                                      <AssignmentImageGallery
                                        assignmentId={selectedClientAssignment.assignmentId}
                                        dispatchId={selectedClientAssignment.id}
                                        type="start"
                                        showUpload={true}
                                      />
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                      <Label className="flex items-center gap-2 mb-3 text-blue-700">
                                        <Download className="h-4 w-4" />
                                        <span className="font-medium">Evidencia de Descarga</span>
                                      </Label>
                                      <AssignmentImageGallery
                                        assignmentId={selectedClientAssignment.assignmentId}
                                        dispatchId={selectedClientAssignment.id}
                                        type="unloading"
                                        showUpload={true}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Botones de Acción */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                  <Button
                                    variant="outline"
                                    onClick={closeDeliveryForm}
                                    disabled={isProcessing}
                                    className="flex-1"
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    onClick={() => selectedClientAssignment && completeDelivery(selectedClientAssignment)}
                                    disabled={
                                      isProcessing || 
                                      !selectedClientAssignment || 
                                      !deliveryEvidence[selectedClientAssignment.id]?.quantity ||
                                      !marcadorInicial ||
                                      !marcadorFinal
                                    }
                                    className={`flex-1 ${isProcessing ? 'opacity-75 cursor-not-allowed' : ''}`}
                                  >
                                    {isProcessing ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Procesando... (30s max)
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Completar Entrega
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Entregas Completadas */}
            {showCompleted && completedDeliveries.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Entregas Completadas ({completedDeliveries.length})
                </h4>
                <div className="space-y-4">
                  {completedDeliveries.map((clientAssignment) => (
                    <Card key={`completed-${clientAssignment.assignmentId}-${clientAssignment.id}`} className="border-green-200 bg-green-50">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col sm:flex-row justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-green-800">
                              <CheckCircle className="h-4 w-4" />
                              {clientAssignment.customer.companyname}
                            </CardTitle>
                            <CardDescription className="text-green-600">
                              <div className="space-y-1">
                                <p className="flex items-center gap-2 text-sm">
                                  <FileText className="h-3 w-3" />
                                  RUC: {clientAssignment.customer.ruc}
                                </p>
                                {clientAssignment.completedAt && (
                                  <p className="flex items-center gap-2 text-xs">
                                    <History className="h-3 w-3" />
                                    Completado: {new Date(clientAssignment.completedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </CardDescription>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <Badge className="bg-green-600 text-white">
                              ✓ Completado
                            </Badge>
                            <div className="text-right text-sm">
                              <p className="text-green-800 font-medium">
                                {Number(clientAssignment.deliveredQuantity || 0).toFixed(2)} gal entregados
                              </p>
                              <p className="text-green-600 text-xs">
                                de {Number(clientAssignment.allocatedQuantity).toFixed(2)} gal asignados
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay entregas */}
            {pendingDeliveries.length === 0 && completedDeliveries.length === 0 && (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No hay entregas para esta fecha
                  </h3>
                </CardContent>
              </Card>
            )}

            {/* Mensaje cuando solo hay completadas pero están ocultas */}
            {pendingDeliveries.length === 0 && completedDeliveries.length > 0 && !showCompleted && (
              <Card className="text-center bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    ¡Todas las entregas completadas!
                  </h3>
                  <p className="text-green-600 mb-4">
                    Has completado todas las {completedDeliveries.length} entregas programadas.
                  </p>
                  <Button 
                    onClick={() => setShowCompleted(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <History className="h-4 w-4 mr-2" />
                    Ver historial de entregas
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}