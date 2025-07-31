"use client"

import React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  CheckCircle, 
  MapPin, 
  Truck, 
  FileText, 
  Play, 
  Navigation,
  Clock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Camera,
  Save
} from "lucide-react"
import { CloudinaryUpload } from "./CloudinaryUpload"
import { useToast } from "@/hooks/use-toast"
import { useMobileDispatchStore } from "@/stores/mobileDispatchStore"
import axios from "axios"

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

interface MobileDispatchCardProps {
  assignment: ExtendedAssignment
  onUpdate?: () => void
}

const DISPATCH_STAGES = {
  loading_start: {
    label: "Inicio Carga",
    icon: Play,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
    required: true
  },
  loading_end: {
    label: "Término Carga",
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
    required: true
  },
  delivery: {
    label: "Entrega",
    icon: MapPin,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
    required: true
  },
  client_confirmation: {
    label: "Conformidad",
    icon: FileText,
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
    required: false
  },
}

export function MobileDispatchCard({ assignment, onUpdate }: MobileDispatchCardProps) {
  const { toast } = useToast()
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [observations, setObservations] = useState("")
  const [stagePhotos, setStagePhotos] = useState<Record<string, any[]>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [quantityDelivered, setQuantityDelivered] = useState("")

  // Usar el store móvil
  const {
    currentTrip,
    isOnline,
    pendingSync,
    startTrip,
    endTrip,
    updateClientDelivery,
    completeClientDelivery,
    addPhotoToDelivery,
    validateNextDelivery,
    syncWithServer
  } = useMobileDispatchStore()

  // Estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "Conexión restaurada",
        description: "Sincronizando datos...",
      })
      syncWithServer()
    }

    const handleOffline = () => {
      toast({
        title: "Sin conexión",
        description: "Los datos se guardarán localmente",
        variant: "destructive",
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [toast, syncWithServer])

  // Sincronización automática
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && pendingSync.length > 0) {
        syncWithServer()
      }
    }, 30000) // Cada 30 segundos

    return () => clearInterval(interval)
  }, [isOnline, pendingSync.length, syncWithServer])

  const handleStagePhotoUpload = (stage: string, files: any[]) => {
    setStagePhotos(prev => ({
      ...prev,
      [stage]: [...(prev[stage] || []), ...files]
    }))
  }

  const handleStartDispatch = async () => {
    try {
      setIsProcessing(true)
      
      // 1. Iniciar trayecto en el store
      startTrip(assignment.id, assignment.driverId)
      
      // 2. Activar ubicación automáticamente
      if (navigator.geolocation) {
        // Solicitar permisos y iniciar tracking
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            updateLocation(latitude, longitude)
            
            // Enviar ubicación inicial al servidor
            sendLocationToServer(latitude, longitude)
            
            toast({
              title: "🚛 Despacho iniciado",
              description: "Tracking de ubicación activado automáticamente",
              className: "border-green-200 bg-green-50",
            })
          },
          (error) => {
            console.error('Error getting location:', error)
            toast({
              title: "⚠️ Advertencia",
              description: "No se pudo obtener ubicación. El despacho continuará sin tracking.",
              variant: "destructive",
            })
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        )
      }
      
      // 3. Cambiar estado de assignment
      await axios.post(`/api/assignments/${assignment.id}/start-trip`)
      
    } catch (error: any) {
      console.error('Error starting dispatch:', error)
      toast({
        title: "❌ Error",
        description: error.response?.data?.error || "No se pudo iniciar el despacho",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const sendLocationToServer = async (lat: number, lng: number) => {
    try {
      await axios.post(`/api/despacho/${assignment.driverId}/location`, {
        latitude: lat,
        longitude: lng,
        assignmentId: assignment.id
      })
    } catch (error) {
      console.error('Error sending location:', error)
    }
  }

  const handleStartStage = (stage: string) => {
    setActiveStage(stage)
    
    // Si es el primer cliente, iniciar trayecto
    if (stage === 'loading_start' && !currentTrip) {
      startTrip(assignment.id, assignment.driverId)
      toast({
        title: "Trayecto iniciado",
        description: "Tracking automático activado",
      })
    }
  }

  const handleCompleteStage = async (stage: string) => {
    if (!activeStage) return

    setIsProcessing(true)

    try {
      // Validar fotos requeridas
      const stageConfig = DISPATCH_STAGES[stage as keyof typeof DISPATCH_STAGES]
      const photos = stagePhotos[stage] || []
      
      if (stageConfig.required && photos.length === 0) {
        toast({
          title: "Fotos requeridas",
          description: `Debe subir al menos una foto para ${stageConfig.label}`,
          variant: "destructive",
        })
        return
      }

      // Procesar fotos
      const uploadedPhotos = await Promise.all(
        photos.map(async (photo) => {
          const uploadedFile = {
            id: `photo_${Date.now()}_${Math.random()}`,
            url: photo.url,
            type: 'photo' as const,
            stage: stage as any,
            timestamp: new Date(),
            clientId: assignment.clientAssignments?.[0]?.customerId
          }
          
          // Agregar al store
          if (assignment.clientAssignments?.[0]?.customerId) {
            addPhotoToDelivery(assignment.clientAssignments[0].customerId, uploadedFile)
          }
          
          return uploadedFile
        })
      )

      // Actualizar observaciones
      if (observations.trim()) {
        if (assignment.clientAssignments?.[0]?.customerId) {
          updateClientDelivery(assignment.clientAssignments[0].customerId, {
            observations: observations.trim()
          })
        }
      }

      // Enviar al servidor
      const response = await axios.post(`/api/assignments/${assignment.id}/stage`, {
        stage,
        photos: uploadedPhotos,
        observations: observations.trim(),
        marcadorInicial: marcadorInicial ? parseFloat(marcadorInicial) : undefined,
        marcadorFinal: marcadorFinal ? parseFloat(marcadorFinal) : undefined,
        quantityDelivered: quantityDelivered ? parseFloat(quantityDelivered) : undefined
      })

      if (response.data.success) {
        toast({
          title: "Etapa completada",
          description: `${stageConfig.label} registrado correctamente`,
        })

        // Limpiar estado
        setActiveStage(null)
        setObservations("")
        setStagePhotos(prev => ({ ...prev, [stage]: [] }))
        setMarcadorInicial("")
        setMarcadorFinal("")
        setQuantityDelivered("")

        // Si es la última etapa, completar entrega
        if (stage === 'client_confirmation' && assignment.clientAssignments?.[0]?.customerId) {
          completeClientDelivery(assignment.clientAssignments[0].customerId)
          
          // Si es la última entrega, finalizar trayecto
          if (currentTrip && assignment.clientAssignments?.length === 1) {
            endTrip()
            toast({
              title: "Trayecto completado",
              description: "Todas las entregas han sido finalizadas",
            })
          }
        }

        onUpdate?.()
      }
    } catch (error: any) {
      console.error("Error completing stage:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Error al completar etapa",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const canStartDelivery = () => {
    if (!assignment.clientAssignments?.[0]?.customerId) return false
    return validateNextDelivery(assignment.clientAssignments[0].customerId)
  }

  const getProgressPercentage = () => {
    const completedStages = Object.keys(stagePhotos).filter(stage => 
      stagePhotos[stage] && stagePhotos[stage].length > 0
    ).length
    return (completedStages / Object.keys(DISPATCH_STAGES).length) * 100
  }

  const currentClient = assignment.clientAssignments?.[0]?.customer

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">
              {currentClient?.companyname || "Cliente"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicador de conexión */}
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-gray-500">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            
            {/* Indicador de sincronización */}
            {pendingSync.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {pendingSync.length} pendiente
              </Badge>
            )}
          </div>
        </div>

        {/* Información del cliente */}
        {currentClient && (
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>RUC:</strong> {currentClient.ruc}</p>
            <p><strong>Dirección:</strong> {currentClient.address || "No especificada"}</p>
            <p><strong>Cantidad asignada:</strong> {assignment.clientAssignments?.[0]?.allocatedQuantity} galones</p>
          </div>
        )}

        {/* Estado del trayecto */}
        {currentTrip && (
          <Alert>
            <Navigation className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <strong>Trayecto activo</strong> - Tracking automático activado
                  {currentTrip.currentLocation && (
                    <span className="block text-xs">
                      Ubicación: {currentTrip.currentLocation.lat.toFixed(4)}, {currentTrip.currentLocation.lng.toFixed(4)}
                    </span>
                  )}
                </div>
                <Badge variant="default" className="bg-green-600">
                  <Wifi className="h-3 w-3 mr-1" />
                  En Trayecto
                </Badge>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Progreso general */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progreso general</span>
            <span>{Math.round(getProgressPercentage())}%</span>
          </div>
          <Progress value={getProgressPercentage()} className="h-2" />
        </div>

        {/* Botón Iniciar Despacho */}
        {!currentTrip && (
          <Button
            onClick={handleStartDispatch}
            disabled={isProcessing || !canStartDelivery()}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Truck className="h-4 w-4 mr-2" />
                🚛 Iniciar Despacho
              </>
            )}
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validación secuencial */}
        {!canStartDelivery() && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Debe completar las entregas en orden secuencial. 
              No puede iniciar esta entrega hasta completar la anterior.
            </AlertDescription>
          </Alert>
        )}

        {/* Etapas de documentación */}
        <div className="space-y-4">
          {Object.entries(DISPATCH_STAGES).map(([stageKey, stageConfig]) => {
            const Icon = stageConfig.icon
            const photos = stagePhotos[stageKey] || []
            const isActive = activeStage === stageKey
            const isCompleted = photos.length > 0

            return (
              <div key={stageKey} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${stageConfig.bgColor}`}>
                      <Icon className={`h-4 w-4 ${stageConfig.textColor}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{stageConfig.label}</h4>
                      <p className="text-sm text-gray-500">
                        {photos.length} foto{photos.length !== 1 ? 's' : ''} subida{photos.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {!isCompleted && canStartDelivery() && (
                      <Button
                        size="sm"
                        onClick={() => handleStartStage(stageKey)}
                        disabled={isProcessing}
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Iniciar
                      </Button>
                    )}
                    
                    {isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveStage(null)}
                        disabled={isProcessing}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contenido de la etapa */}
                {isActive && (
                  <div className="space-y-4">
                    {/* Campos específicos por etapa */}
                    {stageKey === 'loading_start' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="marcadorInicial">Marcador Inicial</Label>
                          <Input
                            id="marcadorInicial"
                            type="number"
                            value={marcadorInicial}
                            onChange={(e) => setMarcadorInicial(e.target.value)}
                            placeholder="Ej: 1000"
                          />
                        </div>
                      </div>
                    )}

                    {stageKey === 'loading_end' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="marcadorFinal">Marcador Final</Label>
                          <Input
                            id="marcadorFinal"
                            type="number"
                            value={marcadorFinal}
                            onChange={(e) => setMarcadorFinal(e.target.value)}
                            placeholder="Ej: 1500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quantityDelivered">Cantidad Entregada</Label>
                          <Input
                            id="quantityDelivered"
                            type="number"
                            value={quantityDelivered}
                            onChange={(e) => setQuantityDelivered(e.target.value)}
                            placeholder="Ej: 500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Subida de fotos */}
                    <div>
                      <Label>Fotos de {stageConfig.label}</Label>
                      <CloudinaryUpload
                        onUpload={(files) => handleStagePhotoUpload(stageKey, files)}
                        folder={`dispatch-${assignment.id}/client-${currentClient?.id}/${stageKey}`}
                        multiple
                        accept="image/*"
                      />
                    </div>

                    {/* Observaciones */}
                    <div>
                      <Label htmlFor="observations">Observaciones</Label>
                      <Textarea
                        id="observations"
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder="Observaciones adicionales..."
                        rows={3}
                      />
                    </div>

                    {/* Botón completar */}
                    <Button
                      onClick={() => handleCompleteStage(stageKey)}
                      disabled={isProcessing || (stageConfig.required && photos.length === 0)}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Completar {stageConfig.label}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Fotos subidas */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo.url}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <Badge className="absolute top-1 right-1 text-xs">
                          ✓
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Botón finalizar trayecto */}
        {currentTrip && assignment.clientAssignments?.length === 1 && (
          <Button
            variant="outline"
            onClick={endTrip}
            disabled={isProcessing}
            className="w-full"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar Trayecto
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
