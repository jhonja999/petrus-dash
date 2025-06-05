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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
} from "lucide-react"
import Link from "next/link"
import axios from "axios"
import type { Discharge, Assignment, Customer } from "@/types/globals.d"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

// ✅ New interface for client assignments
interface ClientAssignment {
  id: number
  customerId: number
  allocatedQuantity: number | string
  deliveredQuantity: number | string
  remainingQuantity: number | string
  status: string
  customer: Customer
  assignmentId: number
}

// ✅ Extended Assignment interface
interface ExtendedAssignment extends Assignment {
  clientAssignments?: ClientAssignment[]
}

export default function DespachoDriverPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const driverId = params.driverId as string

  console.log(`🎯 DespachoDriverPage: Loading for URL with driverId: "${driverId}"`)

  // Basic auth check
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("🔒 DespachoDriverPage: User not authenticated, redirecting to login")
      router.push("/login")
      return
    }
  }, [isLoading, isAuthenticated, router])

  // Estados principales
  const [discharges, setDischarges] = useState<Discharge[]>([])
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para el modal de finalizar descarga
  const [selectedClientAssignment, setSelectedClientAssignment] = useState<ClientAssignment | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Estados para vista de asignación detallada
  const [showAssignmentDetail, setShowAssignmentDetail] = useState(false)
  const [detailAssignment, setDetailAssignment] = useState<ExtendedAssignment | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!driverId) return

      // Validate driverId is a number
      if (isNaN(Number(driverId))) {
        console.log(`❌ DespachoDriverPage: Invalid driverId: "${driverId}"`)
        setError(`ID de conductor inválido: "${driverId}". Debe ser un número.`)
        setLoading(false)
        return
      }

      try {
        setError(null)
        console.log(`🔄 DespachoDriverPage: Fetching data for driver ${driverId}`)

        const today = new Date().toISOString().split("T")[0]

        const [dischargesResponse, assignmentsResponse, customersResponse] = await Promise.all([
          axios.get(`/api/despacho/${driverId}`),
          axios.get(`/api/assignments/dashboard?driverId=${driverId}&date=${today}`),
          axios.get("/api/customers"),
        ])

        console.log(`✅ DespachoDriverPage: Received ${dischargesResponse.data.length} discharges`)
        console.log(`✅ DespachoDriverPage: Received ${assignmentsResponse.data.length} assignments`)

        setDischarges(dischargesResponse.data)
        setAssignments(assignmentsResponse.data)
        setCustomers(customersResponse.data)
      } catch (error) {
        console.error("❌ DespachoDriverPage: Error fetching data:", error)
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 400) {
            setError("ID de conductor inválido o datos incorrectos")
          } else if (error.response?.status === 403) {
            setError("No tienes permisos para acceder a este panel")
          } else {
            setError("Error al cargar los datos")
          }
        } else {
          setError("Error de conexión")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [driverId])

  const refreshData = async () => {
    try {
      const today = new Date().toISOString().split("T")[0]
      const [dischargesResponse, assignmentsResponse] = await Promise.all([
        axios.get(`/api/despacho/${driverId}`),
        axios.get(`/api/assignments/dashboard?driverId=${driverId}&date=${today}`),
      ])
      setDischarges(dischargesResponse.data)
      setAssignments(assignmentsResponse.data)
    } catch (error) {
      console.error("Error refreshing data:", error)
    }
  }

  // ✅ New function to open modal for client assignment
  const openClientAssignmentModal = (clientAssignment: ClientAssignment, assignment: ExtendedAssignment) => {
    setSelectedClientAssignment(clientAssignment)
    setIsModalOpen(true)
    // Pre-fill with assignment's remaining fuel
    setMarcadorInicial(assignment.totalRemaining.toString())
    setMarcadorFinal("")
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedClientAssignment(null)
    setMarcadorInicial("")
    setMarcadorFinal("")
  }

  const openAssignmentDetail = (assignment: ExtendedAssignment) => {
    setDetailAssignment(assignment)
    setShowAssignmentDetail(true)
  }

  const closeAssignmentDetail = () => {
    setShowAssignmentDetail(false)
    setDetailAssignment(null)
  }

  const calculateDeliveredAmount = () => {
    const inicial = Number.parseFloat(marcadorInicial) || 0
    const final = Number.parseFloat(marcadorFinal) || 0
    return inicial - final
  }

  // ✅ New function to complete client assignment
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
    const expectedAmount = Number.parseFloat(selectedClientAssignment.allocatedQuantity.toString())

    if (deliveredAmount <= 0) {
      toast({
        title: "❌ Error",
        description: "La cantidad entregada debe ser mayor a 0",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    toast({
      title: "⏳ Procesando...",
      description: "Finalizando la entrega del cliente",
    })

    try {
      // Update the client assignment
      const response = await axios.put(
        `/api/assignments/${selectedClientAssignment.assignmentId}/clients/${selectedClientAssignment.id}`,
        {
          status: "completed",
          deliveredQuantity: deliveredAmount,
          allocatedQuantity: selectedClientAssignment.allocatedQuantity,
        }
      )

      // Create a discharge record for tracking
      try {
        await axios.post(`/api/despacho/${driverId}`, {
          assignmentId: selectedClientAssignment.assignmentId,
          customerId: selectedClientAssignment.customerId,
          totalDischarged: deliveredAmount,
          marcadorInicial: Number.parseFloat(marcadorInicial),
          marcadorFinal: Number.parseFloat(marcadorFinal),
          status: "finalizado",
          cantidadReal: deliveredAmount,
        })
      } catch (dischargeError) {
        console.log("Note: Could not create discharge record, but client assignment updated successfully")
      }

      toast({
        title: "✅ Entrega completada",
        description: `${selectedClientAssignment.customer.companyname} - ${deliveredAmount.toFixed(2)} galones entregados`,
      })

      // Refresh data
      await refreshData()
      closeModal()

    } catch (error) {
      console.error("Error completing client assignment:", error)
      
      let errorMessage = "Error al completar la entrega"
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = error.response.data?.error || "Datos inválidos"
        } else if (error.response?.status === 404) {
          errorMessage = "Asignación no encontrada"
        } else if (error.response?.status === 403) {
          errorMessage = "No tienes permisos para completar esta entrega"
        }
      }
      
      toast({
        title: "❌ Error al completar entrega",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // ✅ Get all pending client assignments across all assignments
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

  // ✅ Get all completed deliveries
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos del despacho...</p>
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
              <Button onClick={() => window.location.reload()} className="w-full">
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

  // Assignment Detail Modal
  if (showAssignmentDetail && detailAssignment) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-3">
                <Button onClick={closeAssignmentDetail} variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Asignación #{detailAssignment.id}</h1>
                  <p className="text-sm text-gray-600">
                    {detailAssignment.truck.placa} - {detailAssignment.fuelType}
                  </p>
                </div>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    Información de Entrega
                  </CardTitle>
                  <CardDescription>Entregas asignadas por el administrador</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>• Las entregas son asignadas por el administrador</p>
                    <p>• Tu función es realizar y finalizar las entregas</p>
                    <p>• Registra los marcadores inicial y final correctamente</p>
                    <p>• Contacta al administrador para nuevas asignaciones</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Información de la Asignación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Total Cargado</Label>
                    <p className="text-2xl font-bold text-blue-600">{detailAssignment.totalLoaded.toString()} gal</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Remanente</Label>
                    <p className="text-2xl font-bold text-orange-600">
                      {detailAssignment.totalRemaining.toString()} gal
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Progreso</Label>
                  <div className="mt-1">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${((Number(detailAssignment.totalLoaded) - Number(detailAssignment.totalRemaining)) / Number(detailAssignment.totalLoaded)) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {(
                        ((Number(detailAssignment.totalLoaded) - Number(detailAssignment.totalRemaining)) /
                          Number(detailAssignment.totalLoaded)) *
                        100
                      ).toFixed(1)}
                      % completado
                    </p>
                  </div>
                </div>

                {detailAssignment.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Notas</Label>
                    <p className="text-gray-800 bg-gray-50 p-3 rounded-lg mt-1">{detailAssignment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entregas Asignadas</CardTitle>
                <CardDescription>
                  {detailAssignment.clientAssignments?.length || 0} entregas programadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detailAssignment.clientAssignments && detailAssignment.clientAssignments.length > 0 ? (
                  <div className="space-y-3">
                    {detailAssignment.clientAssignments.map((clientAssignment) => (
                      <div key={clientAssignment.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{clientAssignment.customer?.companyname}</h4>
                          <Badge
                            className={
                              clientAssignment.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {clientAssignment.status === "completed" ? "Completado" : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Cantidad asignada: {Number(clientAssignment.allocatedQuantity).toFixed(2)} gal
                        </p>
                        {clientAssignment.status === "completed" && (
                          <p className="text-sm text-green-600">
                            Cantidad entregada: {Number(clientAssignment.deliveredQuantity).toFixed(2)} gal
                          </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          RUC: {clientAssignment.customer?.ruc} • Dirección: {clientAssignment.customer?.address}
                        </p>
                        
                        {clientAssignment.status === "pending" && (
                          <Button
                            onClick={() => openClientAssignmentModal(clientAssignment, detailAssignment)}
                            size="sm"
                            className="w-full mt-2 bg-green-600 hover:bg-green-700"
                          >
                            <Target className="h-4 w-4 mr-2" />
                            Completar Entrega
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay entregas asignadas para esta asignación</p>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
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
              <Link
                href="/"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer"
                title="Ir al inicio"
              >
              <Truck className="h-8 w-8 text-blue-600" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel del Conductor</h1>
                <p className="text-sm text-gray-600">
                  {user?.name} {user?.lastname} - ID: {driverId}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

          {/* ✅ New Entregas Tab */}
          <TabsContent value="entregas" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Entregas del Día</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {completedDeliveries.length} de {totalDeliveries} completadas
              </Badge>
            </div>

            {totalDeliveries === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay entregas para hoy</h3>
                  <p className="text-gray-600">Las entregas aparecerán cuando el administrador te asigne clientes específicos</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Pending Deliveries */}
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

                            <Button
                              onClick={() => openClientAssignmentModal(delivery, delivery.assignment)}
                              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                            >
                              <Target className="h-4 w-4 mr-2" />
                              Completar Entrega
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Deliveries */}
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
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Asignaciones del Día</h2>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {assignments.filter((a) => a.isCompleted).length} de {assignments.length} completadas
              </Badge>
            </div>

            {assignments.length === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay asignaciones para hoy</h3>
                  <p className="text-gray-600">
                    No tienes asignaciones programadas para el día de hoy ({new Date().toLocaleDateString()}).
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
                      <CardDescription>Creada: {new Date(assignment.createdAt).toLocaleDateString()}</CardDescription>
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

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => openAssignmentDetail(assignment)}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalles
                        </Button>
                        {assignment.clientAssignments && assignment.clientAssignments.length > 0 ? (
                          <Badge className="bg-blue-100 text-blue-700">
                            {assignment.clientAssignments.filter(ca => ca.status === "pending").length} pendientes
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-700">Sin entregas asignadas</Badge>
                        )}
                      </div>

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

      {/* ✅ Updated Modal for Client Assignment Completion */}
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