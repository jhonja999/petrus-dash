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
  ImageIcon,
  Plus,
  X,
} from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

// Cloudinary Upload Widget types
declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: any,
        callback: (error: any, result: any) => void
      ) => {
        open: () => void
        close: () => void
      }
    }
  }
}

// Estilos para animaciones
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
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
  uploadedByUser: {
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

  // Estados para el modal
  const [selectedClientAssignment, setSelectedClientAssignment] = useState<ClientAssignment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Estados para tracking de ubicación
  const [isLocationSharing, setIsLocationSharing] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Eliminados estados de imágenes y CloudinaryWidget custom

  // Estados para completar entrega con evidencia
  const [deliveryEvidence, setDeliveryEvidence] = useState<{
    [key: string]: {
      quantity: string
      isComplete: boolean
      images: string[]
    }
  }>({})

  // Basic auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("🔒 DespachoDriverPage: User not authenticated")
      router.push("/login")
      return
    }
  }, [isLoading, isAuthenticated, router])

  // ✅ Función principal para cargar datos
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
      console.log(`📅 Today is: ${today}, Target date: ${targetDate}`)

      // ✅ Sincronizar datos primero si estamos viendo el día actual
      if (targetDate === today) {
        const syncSuccess = await syncOperatorData(driverId)
        if (syncSuccess) {
          console.log("✅ Datos sincronizados correctamente")
        } else {
          console.log("⚠️ Sincronización falló, continuando con datos existentes")
        }
      }

      // ✅ Auto-completar solo si estamos viendo el día actual
      if (targetDate === today) {
        try {
          const autoCompleteResponse = await axios.post("/api/assignments/auto-complete", {
            driverId: Number(driverId),
          })
          console.log("✅ Auto-completed old assignments:", autoCompleteResponse.data)
        } catch (autoCompleteError) {
          console.log("⚠️ Auto-complete failed, continuing anyway", autoCompleteError)
        }
      }

      let assignmentsResponse

      // ✅ Si es HOY, obtener TODAS las asignaciones ACTIVAS
      if (targetDate === today) {
        console.log("📊 Fetching ACTIVE assignments (not filtered by date)")
        assignmentsResponse = await axios.get(`/api/assignments/active?driverId=${driverId}`)
      } else {
        // Si es una fecha específica del pasado, filtrar por esa fecha
        console.log(`📊 Fetching assignments for specific date: ${targetDate}`)
        assignmentsResponse = await axios.get(`/api/assignments/dashboard?driverId=${driverId}&date=${targetDate}`)
      }

      console.log(`✅ Loaded ${assignmentsResponse.data.length} assignments`)

      // Log each assignment for debugging
      assignmentsResponse.data.forEach((assignment: any, index: number) => {
        console.log(`📋 Assignment ${index + 1}:`, {
          id: assignment.id,
          truck: assignment.truck?.placa,
          remaining: assignment.totalRemaining,
          completed: assignment.isCompleted,
          createdAt: assignment.createdAt,
          clientAssignments: assignment.clientAssignments?.length || 0,
        })
      })

      setAssignments(assignmentsResponse.data)
      setLastRefresh(new Date())

      // ✅ Mostrar alerta si no hay asignaciones activas para hoy
      if (targetDate === today && assignmentsResponse.data.length === 0) {
        toast({
          title: "📋 Sin asignaciones activas",
          description:
            "No tienes asignaciones activas en este momento. Contacta al administrador si necesitas una asignación.",
        })
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error)

      let errorMessage = "Error al cargar los datos"
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = "ID de conductor inválido"
        } else if (error.response?.status === 403) {
          errorMessage = "No tienes permisos para acceder a este panel"
        } else if (error.response?.status === 404) {
          errorMessage = "No se encontraron datos para este conductor"
        }
        console.error("❌ API Error details:", error.response?.data)
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Función unificada de actualización/sincronización
  const handleRefresh = async () => {
    setIsRefreshing(true)
    const today = new Date().toISOString().split("T")[0]
    const isToday = selectedDate === today

    try {
      if (isToday) {
        // Para día actual: sincronizar + actualizar datos
        const syncSuccess = await syncOperatorData(driverId)
        if (syncSuccess) {
          toast({
            title: "✅ Datos sincronizados",
            description: "Los datos han sido sincronizados y actualizados correctamente.",
            className: "border-green-200 bg-green-50",
          })
        }
      } else {
        // Para días históricos: solo actualizar datos
        toast({
          title: "🔄 Actualizando datos",
          description: "Refrescando información histórica...",
        })
      }

      await fetchData(selectedDate)
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "No se pudieron actualizar los datos.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // ✅ Función para compartir ubicación
  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "❌ Error",
        description: "Tu navegador no soporta geolocalización.",
        variant: "destructive",
      })
      return
    }

    setIsLocationSharing(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }

      setCurrentLocation(location)

      // Enviar ubicación al servidor para tracking
      await axios.post(`/api/despacho/${driverId}/location`, {
        latitude: location.lat,
        longitude: location.lng,
        timestamp: new Date().toISOString(),
      })

      toast({
        title: "📍 Ubicación compartida",
        description: "Tu ubicación ha sido enviada al sistema de tracking.",
        className: "border-green-200 bg-green-50",
      })

      // Configurar actualización periódica de ubicación cada 5 minutos
      const locationInterval = setInterval(
        async () => {
          try {
            const newPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 30000,
              })
            })

            const newLocation = {
              lat: newPosition.coords.latitude,
              lng: newPosition.coords.longitude,
            }

            setCurrentLocation(newLocation)

            await axios.post(`/api/despacho/${driverId}/location`, {
              latitude: newLocation.lat,
              longitude: newLocation.lng,
              timestamp: new Date().toISOString(),
            })

            console.log("📍 Ubicación actualizada automáticamente")
          } catch (error) {
            console.error("Error actualizando ubicación:", error)
          }
        },
        5 * 60 * 1000,
      ) // 5 minutos

      // Limpiar intervalo cuando el componente se desmonte
      return () => clearInterval(locationInterval)
    } catch (error) {
      console.error("Error obteniendo ubicación:", error)
      toast({
        title: "❌ Error de ubicación",
        description: "No se pudo obtener tu ubicación. Verifica los permisos del navegador.",
        variant: "destructive",
      })
    } finally {
      setIsLocationSharing(false)
    }
  }

  // ✅ Cargar datos al inicializar
  useEffect(() => {
    fetchData()
  }, [driverId])

  // ✅ Cargar datos cuando cambie la fecha
  useEffect(() => {
    if (selectedDate) {
      setLoading(true)
      fetchData(selectedDate)
    }
  }, [selectedDate])


  // Eliminados efectos de carga de imágenes y widget manual

  // ✅ Funciones del modal
  const openClientAssignmentModal = (clientAssignment: ClientAssignment, assignment: ExtendedAssignment) => {
    setSelectedClientAssignment(clientAssignment)
    setIsModalOpen(true)
    setMarcadorInicial(assignment.totalRemaining.toString())
    setMarcadorFinal("")
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedClientAssignment(null)
    setMarcadorInicial("")
    setMarcadorFinal("")
  }

  // ✅ Calcular cantidad entregada basada en evidencia
  const calculateDeliveredAmount = () => {
    if (!selectedClientAssignment) return 0
    
    const evidence = deliveryEvidence[selectedClientAssignment.id]
    
    if (evidence?.isComplete) {
      // Si se dejó completo, usar la cantidad asignada
      return Number.parseFloat(selectedClientAssignment.allocatedQuantity.toString())
    } else {
      // Si es entrega parcial, usar la cantidad especificada
      const deliveredAmount = Number.parseFloat(evidence?.quantity || marcadorFinal) || 0
      return deliveredAmount > 0 ? Number.parseFloat(deliveredAmount.toFixed(2)) : 0
    }
  }

  const completeClientAssignment = async () => {
    if (!selectedClientAssignment || !marcadorInicial) {
      toast({
        title: "❌ Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    const evidence = deliveryEvidence[selectedClientAssignment.id]
    if (!evidence) {
      toast({
        title: "❌ Error",
        description: "Por favor seleccione el tipo de entrega",
        variant: "destructive",
      })
      return
    }

    if (!evidence.isComplete && (!evidence.quantity || Number(evidence.quantity) <= 0)) {
      toast({
        title: "❌ Error",
        description: "Por favor especifique la cantidad entregada",
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

    // Verificar que no se entregue más combustible del que hay disponible en el camión
    const availableFuel = Number.parseFloat(marcadorInicial)
    if (deliveredAmount > availableFuel) {
      toast({
        title: "❌ Error",
        description: `No se puede entregar ${deliveredAmount.toFixed(2)} galones. Solo hay ${availableFuel.toFixed(2)} galones disponibles en el camión.`,
        variant: "destructive",
      })
      return
    }

    // Verificar si la cantidad entregada es significativamente mayor que la asignada (más del 20%)
    if (deliveredAmount > Number(selectedClientAssignment.allocatedQuantity) * 1.2) {
      toast({
        title: "⚠️ Advertencia",
        description: `La cantidad entregada (${deliveredAmount.toFixed(2)} gal) es mucho mayor que la asignada (${Number(selectedClientAssignment.allocatedQuantity).toFixed(2)} gal). Verifique la cantidad.`,
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      console.log("📤 Sending delivery completion request:", {
        assignmentId: selectedClientAssignment.assignmentId,
        clientId: selectedClientAssignment.id,
        data: {
          status: "completed",
          deliveredQuantity: deliveredAmount,
          allocatedQuantity: selectedClientAssignment.allocatedQuantity,
          marcadorInicial: marcadorInicial,
          marcadorFinal: marcadorFinal,
        },
      })

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

      console.log("✅ Entrega completada con éxito:", response.data)

      toast({
        title: "✅ Entrega completada",
        description: `${selectedClientAssignment.customer.companyname} - ${deliveredAmount.toFixed(2)} galones entregados`,
      })

      // Cerrar modal primero
      closeModal()

      // ✅ Sincronizar datos después de completar entrega
      const syncSuccess = await syncOperatorData(driverId)
      if (syncSuccess) {
        toast({
          title: "🔄 Datos sincronizados",
          description: "Los dashboards han sido actualizados automáticamente.",
          className: "border-green-200 bg-green-50",
        })
      }

      // Refrescar los datos después de completar
      await fetchData(selectedDate)

      // Mostrar mensaje de éxito adicional
      setTimeout(() => {
        toast({
          title: "🔄 Datos actualizados",
          description: "Los dashboards han sido actualizados con la nueva información.",
        })
      }, 1000)
    } catch (error) {
      console.error("❌ Error completing assignment:", error)

      let errorMessage = "Error al completar la entrega"
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error
        } else if (error.response?.data?.details) {
          errorMessage = `${error.response.data.error}: ${error.response.data.details}`
        }
        console.error("❌ Full error response:", error.response?.data)
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

  // ✅ Funciones para Cloudinary Upload Widget
  const initializeCloudinary = () => {
    if (typeof window !== 'undefined' && window.cloudinary) {
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'your-cloud-name',
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'your-upload-preset',
          sources: ['local', 'camera'],
          multiple: true,
          maxFiles: 10,
          resourceType: 'image',
          folder: 'petrus-assignments',
          tags: ['assignment-evidence'],
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
          maxFileSize: 10485760, // 10MB
        },
        (error: any, result: any) => {
          if (!error && result.event === 'success') {
            handleCloudinaryUpload(result.info.secure_url)
          } else if (error) {
            console.error('Cloudinary upload error:', error)
            toast({
              title: "❌ Error",
              description: "Error al subir imagen a Cloudinary",
              variant: "destructive",
            })
          }
        }
      )
      setCloudinaryWidget(widget)
    }
  }

  const handleCloudinaryUpload = (imageUrl: string) => {
    if (!currentAssignmentId || !currentUploadType) return

    const key = `${currentAssignmentId}-${currentUploadType}`
    
    // Guardar imagen en la base de datos
    saveImageToDatabase(currentAssignmentId, currentUploadType, imageUrl)
    
    // Actualizar estado local
    setAssignmentImages(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), {
        id: Date.now(), // Temporary ID
        assignmentId: Number(currentAssignmentId),
        type: currentUploadType,
        filename: imageUrl.split('/').pop() || 'image.jpg',
        originalName: 'Cloudinary Upload',
        fileSize: 0,
        mimeType: 'image/jpeg',
        uploadedBy: user?.id || 0,
        url: imageUrl,
        createdAt: new Date().toISOString(),
        uploadedByUser: {
          id: user?.id || 0,
          name: user?.name || '',
          lastname: user?.lastname || ''
        }
      }]
    }))

    toast({
      title: "✅ Imagen subida",
      description: "Imagen subida correctamente a Cloudinary",
    })
  }

  const saveImageToDatabase = async (assignmentId: string, type: 'loading' | 'unloading', imageUrl: string) => {
    try {
      await axios.post('/api/assignments/save-cloudinary-image', {
        assignmentId: Number(assignmentId),
        type: type,
        imageUrl: imageUrl,
        uploadedBy: user?.id
      })
    } catch (error) {
      console.error('Error saving image to database:', error)
    }
  }

  const openCloudinaryWidget = (assignmentId: string, type: 'loading' | 'unloading') => {
    setCurrentAssignmentId(assignmentId)
    setCurrentUploadType(type)
    
    if (cloudinaryWidget) {
      cloudinaryWidget.open()
    } else {
      toast({
        title: "❌ Error",
        description: "Widget de Cloudinary no inicializado",
        variant: "destructive",
      })
    }
  }

  const fetchAssignmentImages = async (assignmentId: string) => {
    try {
      const response = await axios.get(`/api/assignments/upload-images?assignmentId=${assignmentId}`)
      const images = response.data.images || []
      
      // Organizar imágenes por tipo
      const organizedImages: { [key: string]: AssignmentImage[] } = {}
      images.forEach((img: AssignmentImage) => {
        const key = `${assignmentId}-${img.type}`
        if (!organizedImages[key]) {
          organizedImages[key] = []
        }
        organizedImages[key].push(img)
      })
      
      setAssignmentImages(prev => ({
        ...prev,
        ...organizedImages
      }))
    } catch (error) {
      console.error('Error fetching assignment images:', error)
    }
  }

  // ✅ Obtener entregas para el día seleccionado
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

  const pendingDeliveries = getAllPendingDeliveries()
  const completedDeliveries = getAllCompletedDeliveries()
  const totalDeliveries = pendingDeliveries.length + completedDeliveries.length

  // ✅ Verificar si es día actual
  const isToday = selectedDate === new Date().toISOString().split("T")[0]

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
          <CardContent className="space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => fetchData(selectedDate)} className="w-full">
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

  return (
    <div className="min-h-screen bg-gray-50">
      <style>{styles}</style>
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/despacho">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Link>
              </Button>
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel del Conductor</h1>
                <p className="text-sm text-gray-600">
                  {user?.name} {user?.lastname} - ID: {driverId}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* ✅ Selector de fecha */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>

              {/* ✅ Indicador de día actual */}
              <Badge className={isToday ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}>
                {isToday ? "Hoy" : "Histórico"}
              </Badge>

              {/* ✅ Botón de compartir ubicación */}
              {isToday && (
                <Button
                  onClick={handleShareLocation}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 bg-transparent"
                  disabled={isLocationSharing}
                >
                  <Navigation className={`h-4 w-4 ${isLocationSharing ? "animate-pulse" : ""}`} />
                  {isLocationSharing ? "Obteniendo..." : currentLocation ? "Ubicación Activa" : "Compartir Ubicación"}
                </Button>
              )}



              {/* ✅ Botón unificado de actualización/sincronización */}
              <Button
                onClick={handleRefresh}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-transparent"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isToday ? "Sincronizar" : "Actualizar"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Nota explicativa del botón */}
      {isToday && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2">
          <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
            💡 <strong>Sincronizar:</strong> Actualiza estados de camiones, completa asignaciones antiguas y refresca
            datos en tiempo real
            {currentLocation && (
              <span className="ml-4">
                📍 <strong>Ubicación:</strong> Compartiendo posición para tracking
              </span>
            )}
          </div>
        </div>
      )}

      {/* ✅ Alert para fechas pasadas */}
      {!isToday && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              Estás viendo datos históricos del {new Date(selectedDate).toLocaleDateString()}. Las entregas de días
              anteriores se completan automáticamente.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* ✅ Header con estadísticas */}
        <div className="grid gap-4 mb-8 grid-cols-1 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <FileText className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">{assignments.length}</p>
                <p className="text-sm text-gray-600">Asignaciones</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Clock className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-600">{pendingDeliveries.length}</p>
                <p className="text-sm text-gray-600">Entregas Pendientes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{completedDeliveries.length}</p>
                <p className="text-sm text-gray-600">Entregas Completadas</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-600">Última actualización</p>
                <p className="text-sm font-medium">{lastRefresh.toLocaleTimeString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="entregas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entregas" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Entregas ({totalDeliveries})
            </TabsTrigger>
            <TabsTrigger value="asignaciones" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Asignaciones ({assignments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entregas" className="space-y-6">
            {totalDeliveries === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isToday
                      ? "No hay entregas para hoy"
                      : `No hay entregas para ${new Date(selectedDate).toLocaleDateString()}`}
                  </h3>
                  <p className="text-gray-600">
                    {isToday
                      ? "Las entregas aparecerán cuando el administrador te asigne clientes específicos"
                      : "No se encontraron entregas para esta fecha"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Entregas Pendientes */}
                {pendingDeliveries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Entregas Pendientes ({pendingDeliveries.length})
                    </h3>
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {pendingDeliveries.map((delivery) => (
                        <Card
                          key={`${delivery.assignmentId}-${delivery.id}`}
                          className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-yellow-500"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {delivery.customer?.companyname || "Cliente Desconocido"}
                              </CardTitle>
                              <Badge className="bg-yellow-100 text-yellow-700">
                                <Clock className="h-3 w-3 mr-1" />
                                Pendiente
                              </Badge>
                            </div>
                            <CardDescription>
                              Asignación #{delivery.assignment.id} • {delivery.assignment.truck.placa}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Cantidad asignada:</span>
                                <span className="text-lg font-bold text-blue-600">
                                  {Number(delivery.allocatedQuantity).toFixed(2)} gal
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Combustible disponible:</span>
                                <span className="text-md font-medium text-green-600">
                                  {Number(delivery.assignment.totalRemaining).toFixed(2)} gal
                                </span>
                              </div>
                            </div>

                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <p>RUC: {delivery.customer?.ruc || "N/A"}</p>
                              <p>Dirección: {delivery.customer?.address || "N/A"}</p>
                            </div>

                            {isToday && (
                              <Button
                                onClick={() => openClientAssignmentModal(delivery, delivery.assignment)}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-200 active:scale-95"
                              >
                                <Target className="h-4 w-4 mr-2" />
                                Completar Entrega
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entregas Completadas */}
                {completedDeliveries.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      Entregas Completadas ({completedDeliveries.length})
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {completedDeliveries.map((delivery) => (
                        <Card
                          key={`${delivery.assignmentId}-${delivery.id}`}
                          className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-green-500"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-lg">
                                {delivery.customer?.companyname || "Cliente Desconocido"}
                              </CardTitle>
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Completado
                              </Badge>
                            </div>
                            <CardDescription>
                              Asignación #{delivery.assignment.id} • {delivery.assignment.truck.placa}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Cantidad asignada:</span>
                                <span className="font-medium">{Number(delivery.allocatedQuantity).toFixed(2)} gal</span>
                              </div>

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Cantidad entregada:</span>
                                <span className="font-medium text-green-600">
                                  {Number(delivery.deliveredQuantity).toFixed(2)} gal
                                </span>
                              </div>

                              {Math.abs(Number(delivery.allocatedQuantity) - Number(delivery.deliveredQuantity)) >
                              0.01 ? (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Diferencia:</span>
                                  <span
                                    className={`font-medium ${
                                      Number(delivery.deliveredQuantity) > Number(delivery.allocatedQuantity)
                                        ? "text-blue-600"
                                        : "text-orange-600"
                                    }`}
                                  >
                                    {Math.abs(
                                      Number(delivery.allocatedQuantity) - Number(delivery.deliveredQuantity),
                                    ).toFixed(2)}{" "}
                                    gal
                                    {Number(delivery.deliveredQuantity) > Number(delivery.allocatedQuantity)
                                      ? " (extra)"
                                      : " (menos)"}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-600">Diferencia:</span>
                                  <span className="font-medium text-green-600">0.00 gal (cantidad exacta)</span>
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <p>RUC: {delivery.customer?.ruc || "N/A"}</p>
                              <p>
                                Completado:{" "}
                                {delivery.completedAt
                                  ? new Date(delivery.completedAt).toLocaleString()
                                  : delivery.assignment.completedAt
                                    ? new Date(delivery.assignment.completedAt).toLocaleString()
                                    : "N/A"}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="asignaciones" className="space-y-6">
            {assignments.length === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {isToday
                      ? "No hay asignaciones para hoy"
                      : `No hay asignaciones para ${new Date(selectedDate).toLocaleDateString()}`}
                  </h3>
                  <p className="text-gray-600">
                    {isToday
                      ? "No tienes asignaciones programadas para el día de hoy"
                      : "No se encontraron asignaciones para esta fecha"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  // ✅ Calcular correctamente el estado de completado
                  const totalClientAssignments = assignment.clientAssignments?.length || 0
                  const completedClientAssignments =
                    assignment.clientAssignments?.filter((ca) => ca.status === "completed").length || 0
                  const allClientsCompleted =
                    totalClientAssignments > 0 && completedClientAssignments === totalClientAssignments

                  return (
                    <Card key={assignment.id} className="hover:shadow-lg transition-shadow duration-300">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">
                            Asignación #{assignment.id} - {assignment.truck.placa}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge
                              className={
                                assignment.isCompleted ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                              }
                            >
                              {assignment.isCompleted ? "Completada" : "En Progreso"}
                            </Badge>
                            <Badge variant="outline" className="bg-gray-50">
                              {assignment.fuelType}
                            </Badge>
                            {assignment.clientAssignments && assignment.clientAssignments.length > 0 && (
                              <Badge variant="secondary">
                                {completedClientAssignments}/{totalClientAssignments} entregas
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardDescription>
                          Creada: {new Date(assignment.createdAt).toLocaleDateString()}
                          {assignment.completedAt && (
                            <> • Completada: {new Date(assignment.completedAt).toLocaleDateString()}</>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-600 font-medium">Total Cargado</p>
                            <p className="text-xl font-bold text-blue-700">{assignment.totalLoaded.toString()} gal</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-600 font-medium">Descargado</p>
                            <p className="text-xl font-bold text-green-700">
                              {(Number(assignment.totalLoaded) - Number(assignment.totalRemaining)).toFixed(2)} gal
                            </p>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <p className="text-sm text-orange-600 font-medium">Remanente</p>
                            <p className="text-xl font-bold text-orange-700">
                              {assignment.totalRemaining.toString()} gal
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Progreso</span>
                            <span>
                              {assignment.isCompleted
                                ? "100%"
                                : `${(((Number(assignment.totalLoaded) - Number(assignment.totalRemaining)) / Number(assignment.totalLoaded)) * 100).toFixed(1)}%`}
                            </span>
                          </div>
                          <div className="bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${assignment.isCompleted ? "bg-green-500" : "bg-blue-500"}`}
                              style={{
                                width: assignment.isCompleted
                                  ? "100%"
                                  : `${((Number(assignment.totalLoaded) - Number(assignment.totalRemaining)) / Number(assignment.totalLoaded)) * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>

                        {assignment.clientAssignments && assignment.clientAssignments.length > 0 ? (
                          <div className="text-sm text-gray-600">
                            <p className="font-medium mb-2">Entregas asignadas:</p>
                            <div className="space-y-1">
                              {assignment.clientAssignments.map((ca) => (
                                <div key={ca.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                  <span>{ca.customer.companyname}</span>
                                  <Badge
                                    className={
                                      ca.status === "completed"
                                        ? "bg-green-100 text-green-700"
                                        : ca.status === "expired"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-yellow-100 text-yellow-700"
                                    }
                                  >
                                    {ca.status === "completed"
                                      ? "Completada"
                                      : ca.status === "expired"
                                        ? "Expirada"
                                        : "Pendiente"}
                                  </Badge>
                                </div>
                              ))}
                            </div>

                            {/* ✅ Indicador de estado de asignación */}
                            {!assignment.isCompleted && allClientsCompleted && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                <p className="text-xs text-yellow-700">
                                  ⚠️ Todas las entregas completadas. La asignación se marcará como completada
                                  automáticamente.
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 text-center p-4 bg-gray-50 rounded">
                            Sin entregas específicas asignadas
                          </div>
                        )}

                        {/* ✅ Sección de imágenes con Cloudinary UNIFICADA */}
                        {isToday && (
                          <div className="space-y-4 mt-4 pt-4 border-t">
                            <h4 className="font-medium text-sm text-gray-700">📸 Documentación de Imágenes</h4>
                            <AssignmentImageGallery assignmentId={assignment.id} type="loading" />
                            <AssignmentImageGallery assignmentId={assignment.id} type="unloading" />
                          </div>
                        )}

                        {assignment.notes && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>Notas:</strong> {assignment.notes}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ✅ Modal para completar entrega */}
      {isModalOpen && selectedClientAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-xl">Completar Entrega</CardTitle>
              <CardDescription>
                {selectedClientAssignment.customer?.companyname} - {selectedClientAssignment.customer?.ruc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Cantidad asignada:
                  <span className="font-bold ml-1">
                    {Number(selectedClientAssignment.allocatedQuantity).toFixed(2)} gal
                  </span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Dirección: {selectedClientAssignment.customer?.address || "N/A"}
                </p>
              </div>

              <div className="space-y-4">
                {/* Opción: Se dejó completo */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tipo de Entrega</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="partial"
                        defaultChecked
                        onChange={() => {
                          setDeliveryEvidence(prev => ({
                            ...prev,
                            [`${selectedClientAssignment?.id}`]: {
                              ...prev[`${selectedClientAssignment?.id}`],
                              isComplete: false
                            }
                          }))
                        }}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Entrega Parcial</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="deliveryType"
                        value="complete"
                        onChange={() => {
                          setDeliveryEvidence(prev => ({
                            ...prev,
                            [`${selectedClientAssignment?.id}`]: {
                              ...prev[`${selectedClientAssignment?.id}`],
                              isComplete: true,
                              quantity: selectedClientAssignment?.allocatedQuantity.toString() || '0'
                            }
                          }))
                        }}
                        className="text-blue-600"
                      />
                      <span className="text-sm">Se dejó completo</span>
                    </label>
                  </div>
                </div>

                {/* Cantidad entregada (solo para entregas parciales) */}
                {!deliveryEvidence[`${selectedClientAssignment?.id}`]?.isComplete && (
                  <div className="space-y-2">
                    <Label htmlFor="deliveredQuantity">Cantidad Entregada (galones)</Label>
                    <Input
                      id="deliveredQuantity"
                      type="number"
                      step="0.01"
                      value={deliveryEvidence[`${selectedClientAssignment?.id}`]?.quantity || ''}
                      onChange={(e) => {
                        setDeliveryEvidence(prev => ({
                          ...prev,
                          [`${selectedClientAssignment?.id}`]: {
                            ...prev[`${selectedClientAssignment?.id}`],
                            quantity: e.target.value
                          }
                        }))
                        setMarcadorFinal(e.target.value)
                      }}
                      placeholder="Ej: 500.00"
                      className="focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">Cantidad específica entregada al cliente</p>
                  </div>
                )}

                {/* Evidencia fotográfica */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">📸 Evidencia Fotográfica</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedClientAssignment) {
                          openCloudinaryWidget(selectedClientAssignment.assignmentId.toString(), 'unloading')
                        }
                      }}
                      className="text-xs"
                    >
                      <Camera className="h-3 w-3 mr-1" />
                      Subir Fotos
                    </Button>
                  </div>
                  
                  {/* Mostrar imágenes de evidencia */}
                  {assignmentImages[`${selectedClientAssignment?.assignmentId}-unloading`]?.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {assignmentImages[`${selectedClientAssignment?.assignmentId}-unloading`].map((img, index) => (
                        <div key={img.id} className="relative">
                          <img 
                            src={img.url} 
                            alt={`Evidencia ${index + 1}`}
                            className="w-full h-16 object-cover rounded border"
                          />
                          <div className="absolute top-1 right-1 bg-black/50 text-white text-xs px-1 rounded">
                            {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marcadorInicial">Combustible Disponible en el Camión</Label>
                  <Input
                    id="marcadorInicial"
                    type="number"
                    step="0.01"
                    value={marcadorInicial}
                    onChange={(e) => setMarcadorInicial(e.target.value)}
                    placeholder="Ej: 2500.00"
                    className="focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Galones de combustible disponibles en el camión antes de la entrega
                  </p>
                </div>

                {marcadorInicial && deliveryEvidence[selectedClientAssignment?.id || ''] && (
                  <div className={`p-4 rounded-lg ${calculateDeliveredAmount() > 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <Label className={`text-sm ${calculateDeliveredAmount() > 0 ? "text-green-700" : "text-red-700"}`}>
                      Cantidad entregada:
                    </Label>
                    <p
                      className={`font-bold text-xl ${calculateDeliveredAmount() > 0 ? "text-green-700" : "text-red-700"}`}
                    >
                      {calculateDeliveredAmount().toFixed(2)} gal
                      {deliveryEvidence[selectedClientAssignment?.id || '']?.isComplete && (
                        <span className="text-sm font-normal ml-2">(Entrega completa)</span>
                      )}
                    </p>

                    {selectedClientAssignment && calculateDeliveredAmount() > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-green-600">
                          Diferencia con lo asignado: {(() => {
                            const difference = Math.abs(
                              calculateDeliveredAmount() - Number(selectedClientAssignment.allocatedQuantity),
                            )
                            if (difference < 0.01) {
                              return "0.00 gal (cantidad exacta)"
                            } else {
                              return `${difference.toFixed(2)} gal ${
                                calculateDeliveredAmount() > Number(selectedClientAssignment.allocatedQuantity)
                                  ? "(entregando más)"
                                  : "(entregando menos)"
                              }`
                            }
                          })()}
                        </p>

                        <p className="text-xs text-blue-600">
                          Combustible restante en camión:{" "}
                          {(Number.parseFloat(marcadorInicial) - calculateDeliveredAmount()).toFixed(2)} gal
                        </p>
                      </div>
                    )}

                    {calculateDeliveredAmount() <= 0 && (
                      <p className="text-xs text-red-600 mt-1">La cantidad entregada debe ser mayor a 0</p>
                    )}

                    {calculateDeliveredAmount() > Number.parseFloat(marcadorInicial) && (
                      <p className="text-xs text-red-600 mt-1">
                        No se puede entregar más combustible del disponible en el camión
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={closeModal}
                  variant="outline"
                  className="flex-1 hover:bg-gray-100 active:scale-95 transition-all duration-200 bg-transparent"
                  disabled={isProcessing}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={completeClientAssignment}
                  disabled={
                    isProcessing ||
                    !marcadorInicial ||
                    !deliveryEvidence[selectedClientAssignment?.id || ''] ||
                    (!deliveryEvidence[selectedClientAssignment?.id || '']?.isComplete && 
                     (!deliveryEvidence[selectedClientAssignment?.id || '']?.quantity || 
                      Number(deliveryEvidence[selectedClientAssignment?.id || '']?.quantity) <= 0)) ||
                    calculateDeliveredAmount() > Number.parseFloat(marcadorInicial)
                  }
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 transition-all duration-200 active:scale-95"
                >
                  {isProcessing ? (
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
