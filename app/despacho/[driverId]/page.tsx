"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Truck,
  MapPin,
  Fuel,
  Clock,
  ArrowLeft,
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Eye,
  Target,
  Loader2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface ClientAssignment {
  id: number
  customerId: number
  allocatedQuantity: number | string
  deliveredQuantity: number | string
  remainingQuantity: number | string
  status: string
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
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )

  // Estados para el modal
  const [selectedClientAssignment, setSelectedClientAssignment] = useState<ClientAssignment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

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

      // ✅ Auto-completar solo si estamos viendo el día actual
      if (targetDate === today) {
        try {
          const autoCompleteResponse = await axios.post('/api/assignments/auto-complete', { 
            driverId: Number(driverId) 
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
        assignmentsResponse = await axios.get(
          `/api/assignments/dashboard?driverId=${driverId}&date=${targetDate}`
        )
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
          clientAssignments: assignment.clientAssignments?.length || 0
        })
      })
      
      setAssignments(assignmentsResponse.data)
      setLastRefresh(new Date())

      // ✅ Mostrar alerta si no hay asignaciones activas para hoy
      if (targetDate === today && assignmentsResponse.data.length === 0) {
        toast({
          title: "📋 Sin asignaciones activas",
          description: "No tienes asignaciones activas en este momento. Contacta al administrador si necesitas una asignación.",
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

  // ✅ Auto-refresh cada 5 minutos si es el día actual
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    if (selectedDate === today) {
      const interval = setInterval(() => {
        console.log("🔄 Auto-refreshing current day assignments")
        fetchData(selectedDate)
      }, 5 * 60 * 1000) // 5 minutos

      return () => clearInterval(interval)
    }
  }, [selectedDate])

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

  const calculateDeliveredAmount = () => {
    const inicial = Number.parseFloat(marcadorInicial) || 0
    const final = Number.parseFloat(marcadorFinal) || 0
    return inicial - final
  }

  const completeClientAssignment = async () => {
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

    setIsProcessing(true)

    try {
      await axios.put(
        `/api/assignments/${selectedClientAssignment.assignmentId}/clients/${selectedClientAssignment.id}`,
        {
          status: "completed",
          deliveredQuantity: deliveredAmount,
          allocatedQuantity: selectedClientAssignment.allocatedQuantity,
        }
      )

      toast({
        title: "✅ Entrega completada",
        description: `${selectedClientAssignment.customer.companyname} - ${deliveredAmount.toFixed(2)} galones`,
      })

      await fetchData(selectedDate)
      closeModal()

    } catch (error) {
      console.error("Error completing assignment:", error)
      
      let errorMessage = "Error al completar la entrega"
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        errorMessage = error.response.data.error
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

  // ✅ Obtener entregas para el día seleccionado
  const getAllPendingDeliveries = () => {
    const pendingDeliveries: (ClientAssignment & { assignment: ExtendedAssignment })[] = []
    
    assignments.forEach(assignment => {
      if (assignment.clientAssignments) {
        assignment.clientAssignments.forEach(clientAssignment => {
          if (clientAssignment.status === "pending") {
            pendingDeliveries.push({
              ...clientAssignment,
              assignment: assignment
            })
          }
        })
      }
    })
    
    return pendingDeliveries
  }

  const getAllCompletedDeliveries = () => {
    const completedDeliveries: (ClientAssignment & { assignment: ExtendedAssignment })[] = []
    
    assignments.forEach(assignment => {
      if (assignment.clientAssignments) {
        assignment.clientAssignments.forEach(clientAssignment => {
          if (clientAssignment.status === "completed") {
            completedDeliveries.push({
              ...clientAssignment,
              assignment: assignment
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
              <Button asChild variant="outline" className="w-full">
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
              
              {/* ✅ Botón de refresh */}
              <Button
                onClick={() => fetchData(selectedDate)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Alert para fechas pasadas */}
      {!isToday && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription>
              Estás viendo datos históricos del {new Date(selectedDate).toLocaleDateString()}. 
              Las entregas de días anteriores se completan automáticamente.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ✅ Header con estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                    {isToday ? "No hay entregas para hoy" : `No hay entregas para ${new Date(selectedDate).toLocaleDateString()}`}
                  </h3>
                  <p className="text-gray-600">
                    {isToday 
                      ? "Las entregas aparecerán cuando el administrador te asigne clientes específicos" 
                      : "No se encontraron entregas para esta fecha"
                    }
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
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                            <div className="flex items-center space-x-2">
                              <Fuel className="h-4 w-4 text-blue-600" />
                              <span className="text-sm font-medium">Cantidad asignada:</span>
                              <span className="text-lg font-bold text-blue-600">
                                {Number(delivery.allocatedQuantity).toFixed(2)} gal
                              </span>
                            </div>

                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <p>RUC: {delivery.customer?.ruc || "N/A"}</p>
                              <p>Dirección: {delivery.customer?.address || "N/A"}</p>
                            </div>

                            {isToday && (
                              <Button
                                onClick={() => openClientAssignmentModal(delivery, delivery.assignment)}
                                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
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
                          <CardContent className="space-y-2">
                            <div className="text-sm text-gray-600">
                              <p><strong>Cantidad asignada:</strong> {Number(delivery.allocatedQuantity).toFixed(2)} gal</p>
                              <p className="text-green-600">
                                <strong>Cantidad entregada:</strong> {Number(delivery.deliveredQuantity).toFixed(2)} gal
                              </p>
                            </div>
                            
                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <p>RUC: {delivery.customer?.ruc || "N/A"}</p>
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
                    {isToday ? "No hay asignaciones para hoy" : `No hay asignaciones para ${new Date(selectedDate).toLocaleDateString()}`}
                  </h3>
                  <p className="text-gray-600">
                    {isToday 
                      ? "No tienes asignaciones programadas para el día de hoy" 
                      : "No se encontraron asignaciones para esta fecha"
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
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
                              {assignment.clientAssignments.length} entregas
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
                                <Badge className={
                                  ca.status === "completed" 
                                    ? "bg-green-100 text-green-700" 
                                    : ca.status === "expired"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }>
                                  {ca.status === "completed" ? "Completada" : 
                                   ca.status === "expired" ? "Expirada" : "Pendiente"}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center p-4 bg-gray-50 rounded">
                          Sin entregas específicas asignadas
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
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* ✅ Modal para completar entrega */}
      {isModalOpen && selectedClientAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                  <span className="font-bold ml-1">{Number(selectedClientAssignment.allocatedQuantity).toFixed(2)} gal</span>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Dirección: {selectedClientAssignment.customer?.address || "N/A"}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="marcadorInicial">Marcador Inicial (Combustible Antes)</Label>
                  <Input
                    id="marcadorInicial"
                    type="number"
                    step="0.01"
                    value={marcadorInicial}
                    onChange={(e) => setMarcadorInicial(e.target.value)}
                    placeholder="Ej: 2500.00"
                  />
                  <p className="text-xs text-gray-500">Galones de combustible antes de la entrega</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marcadorFinal">Marcador Final (Combustible Después)</Label>
                  <Input
                    id="marcadorFinal"
                    type="number"
                    step="0.01"
                    value={marcadorFinal}
                    onChange={(e) => setMarcadorFinal(e.target.value)}
                    placeholder="Ej: 2000.00"
                  />
                  <p className="text-xs text-gray-500">Galones de combustible después de la entrega</p>
                </div>

                {marcadorInicial && marcadorFinal && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <Label className="text-sm text-green-700">Cantidad entregada:</Label>
                    <p className="font-bold text-green-700 text-xl">{calculateDeliveredAmount().toFixed(2)} gal</p>
                    
                    {selectedClientAssignment && (
                      <p className="text-xs text-green-600 mt-1">
                        Diferencia con lo asignado:{" "}
                        {Math.abs(calculateDeliveredAmount() - Number(selectedClientAssignment.allocatedQuantity)).toFixed(2)} gal
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={closeModal} variant="outline" className="flex-1" disabled={isProcessing}>
                  Cancelar
                </Button>
                <Button
                  onClick={completeClientAssignment}
                  disabled={isProcessing || !marcadorInicial || !marcadorFinal}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
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