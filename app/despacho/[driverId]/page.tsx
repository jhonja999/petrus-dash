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
      router.push("/login")
    }
  }, [isLoading, isAuthenticated, router])

  // Cargar asignaciones al iniciar
  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await axios.get("/api/assignments", {
          params: {
            driverId: Number(driverId),
            date: selectedDate,
          },
        })
        setAssignments(res.data.assignments)
      } catch (err) {
        setError("Error al cargar las asignaciones. Inténtalo de nuevo más tarde.")
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [driverId, selectedDate, isRefreshing])

  // Handler para refrescar datos
  const handleRefresh = () => {
    setLastRefresh(new Date())
    setIsRefreshing((prev) => !prev)
  }

  // Helper for assignment completion (admin/operator)
  const completeAssignment = async (assignmentId: number) => {
    try {
      // Completa la asignación en la base de datos usando el endpoint correcto
      await axios.post(`/api/assignments/${assignmentId}/complete`)
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
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
            </Button>
            <h1 className="text-2xl font-bold">Panel de Asignaciones y Reportes</h1>
          </div>
          <Button
            variant="default"
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <Tabs defaultValue="asignaciones" className="space-y-6">
          <TabsList>
            <TabsTrigger value="asignaciones">Asignaciones</TabsTrigger>
            {/* Future: <TabsTrigger value="entregas">Entregas</TabsTrigger> */}
          </TabsList>
          <TabsContent value="asignaciones" className="space-y-8">
            {assignments.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-lg text-gray-600">No hay asignaciones para mostrar.</p>
              </div>
            ) : (
              assignments.map((assignment) => (
                <Card key={assignment.id} className="bg-white rounded-lg shadow p-6 mb-6 border border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-blue-700">Asignación #{assignment.id}</CardTitle>
                    <CardDescription>
                      Conductor: {assignment.driver?.name} {assignment.driver?.lastname} | Camión: {assignment.truck?.placa} | Tipo: {assignment.fuelType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${assignment.isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {assignment.isCompleted ? 'Completada' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    {/* Reporte/Evidencia */}
                    <div className="mb-4">
                      <h3 className="text-lg font-medium mb-2">Reporte de Evidencia</h3>
                      <AssignmentImageGallery
                        assignmentId={assignment.id}
                        type="evidence"
                        showUpload={false}
                      />
                    </div>
                    {/* Subir evidencia */}
                    <div className="mb-4">
                      <CloudinaryUpload
                        context={{ assignmentId: String(assignment.id), type: 'evidence' }}
                        onUpload={() => handleRefresh()}
                        label="Subir Evidencia"
                        multiple={true}
                        folder={`assignments/${assignment.id}`}
                      />
                    </div>
                    {/* Completar asignación (solo si no está completada) */}
                    {!assignment.isCompleted && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => completeAssignment(assignment.id)}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Completar Asignación
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
