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
  Plus,
  Target,
} from "lucide-react"
import Link from "next/link"
import axios from "axios"
import type { Discharge, Assignment, Customer } from "@/types/globals.d"
import { useAuth } from "@/contexts/AuthContext"

export default function DespachoDriverPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
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
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para el modal de finalizar descarga
  const [selectedDischarge, setSelectedDischarge] = useState<Discharge | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Estados para crear nuevo despacho
  const [showNewDischargeModal, setShowNewDischargeModal] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [newDischargeData, setNewDischargeData] = useState({
    customerId: "",
    totalDischarged: "",
    marcadorInicial: "",
  })

  // Estados para vista de asignación detallada
  const [showAssignmentDetail, setShowAssignmentDetail] = useState(false)
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null)

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

  const openModal = (discharge: Discharge) => {
    setSelectedDischarge(discharge)
    setIsModalOpen(true)
    setMarcadorInicial(discharge.marcadorInicial?.toString() || "")
    setMarcadorFinal(discharge.marcadorFinal?.toString() || "")
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedDischarge(null)
    setMarcadorInicial("")
    setMarcadorFinal("")
  }

  const openNewDischargeModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setShowNewDischargeModal(true)
    // Pre-llenar el marcador inicial con el combustible actual del camión
    setNewDischargeData({
      customerId: "",
      totalDischarged: "",
      marcadorInicial: assignment.totalRemaining.toString(),
    })
  }

  const closeNewDischargeModal = () => {
    setShowNewDischargeModal(false)
    setSelectedAssignment(null)
    setNewDischargeData({
      customerId: "",
      totalDischarged: "",
      marcadorInicial: "",
    })
  }

  const openAssignmentDetail = (assignment: Assignment) => {
    setDetailAssignment(assignment)
    setShowAssignmentDetail(true)
  }

  const closeAssignmentDetail = () => {
    setShowAssignmentDetail(false)
    setDetailAssignment(null)
  }

  const calculateDischargedAmount = () => {
    const inicial = Number.parseFloat(marcadorInicial) || 0
    const final = Number.parseFloat(marcadorFinal) || 0
    return inicial - final
  }

  const calculateNewDischargeAmount = () => {
    const inicial = Number.parseFloat(newDischargeData.marcadorInicial) || 0
    const toDischarge = Number.parseFloat(newDischargeData.totalDischarged) || 0
    return inicial - toDischarge
  }

  const createNewDischarge = async () => {
    if (
      !selectedAssignment ||
      !newDischargeData.customerId ||
      !newDischargeData.totalDischarged ||
      !newDischargeData.marcadorInicial
    ) {
      alert("Por favor complete todos los campos")
      return
    }

    const totalDischarged = Number.parseFloat(newDischargeData.totalDischarged)
    const marcadorInicial = Number.parseFloat(newDischargeData.marcadorInicial)

    // Validar que no exceda el combustible disponible
    if (totalDischarged > Number(selectedAssignment.totalRemaining)) {
      alert(`No hay suficiente combustible. Disponible: ${selectedAssignment.totalRemaining} gal`)
      return
    }

    // Validar que el marcador inicial sea correcto
    if (marcadorInicial !== Number(selectedAssignment.totalRemaining)) {
      const confirm = window.confirm(
        `El marcador inicial (${marcadorInicial}) no coincide con el combustible disponible (${selectedAssignment.totalRemaining}). ¿Desea continuar?`,
      )
      if (!confirm) return
    }

    setIsProcessing(true)

    try {
      const response = await axios.post(`/api/despacho/${driverId}`, {
        assignmentId: selectedAssignment.id,
        customerId: Number.parseInt(newDischargeData.customerId),
        totalDischarged: totalDischarged,
        marcadorInicial: marcadorInicial,
      })

      if (response.status === 201) {
        alert("Despacho creado exitosamente")
        await refreshData()
        closeNewDischargeModal()
      }
    } catch (error) {
      console.error("Error creating discharge:", error)
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.error || "Error al crear el despacho")
      } else {
        alert("Error de conexión al crear el despacho")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const finalizeDischarge = async () => {
    if (!selectedDischarge || !marcadorInicial || !marcadorFinal) {
      alert("Por favor complete todos los campos")
      return
    }

    const cantidadDepositada = calculateDischargedAmount()
    const cantidadEsperada = Number.parseFloat(selectedDischarge.totalDischarged.toString())
    const tolerancia = cantidadEsperada * 0.02
    const esCorrecto = Math.abs(cantidadDepositada - cantidadEsperada) <= tolerancia

    if (!esCorrecto) {
      const diferencia = Math.abs(cantidadDepositada - cantidadEsperada).toFixed(2)
      const confirmacion = confirm(
        `La cantidad depositada (${cantidadDepositada.toFixed(2)}) difiere de la esperada (${cantidadEsperada}) por ${diferencia} unidades. ¿Desea continuar?`,
      )
      if (!confirmacion) return
    }

    setIsProcessing(true)

    try {
      const response = await axios.put(`/api/discharges/${selectedDischarge.id}`, {
        status: "finalizado",
        marcadorInicial: Number.parseFloat(marcadorInicial),
        marcadorFinal: Number.parseFloat(marcadorFinal),
        cantidadReal: cantidadDepositada,
      })

      setDischarges((prev) => prev.map((d) => (d.id === selectedDischarge.id ? response.data : d)))

      // Actualizar la asignación correspondiente
      await refreshData()

      alert("Despacho finalizado correctamente")
      closeModal()
    } catch (error) {
      console.error("Error finalizing discharge:", error)
      alert("Error al finalizar el despacho")
    } finally {
      setIsProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando datos del despacho...</p>
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
              <Button
                onClick={() => openNewDischargeModal(detailAssignment)}
                className="bg-green-600 hover:bg-green-700"
                disabled={Number(detailAssignment.totalRemaining) <= 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Despacho
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Assignment Info */}
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

            {/* Discharges for this assignment */}
            <Card>
              <CardHeader>
                <CardTitle>Descargas de esta Asignación</CardTitle>
              </CardHeader>
              <CardContent>
                {detailAssignment.discharges && detailAssignment.discharges.length > 0 ? (
                  <div className="space-y-3">
                    {detailAssignment.discharges.map((discharge) => (
                      <div key={discharge.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{discharge.customer?.companyname}</h4>
                          <Badge
                            className={
                              discharge.status === "finalizado"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }
                          >
                            {discharge.status === "finalizado" ? "Completado" : "Pendiente"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">Cantidad: {discharge.totalDischarged.toString()} gal</p>
                        {discharge.status === "finalizado" && (
                          <div className="text-xs text-gray-500 mt-1">
                            <p>Marcador inicial: {discharge.marcadorInicial?.toString() || "N/A"}</p>
                            <p>Marcador final: {discharge.marcadorFinal?.toString() || "N/A"}</p>
                            <p>Cantidad real: {discharge.cantidadReal?.toString() || "N/A"} gal</p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">{new Date(discharge.createdAt).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No hay descargas registradas para esta asignación</p>
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
      {/* Header */}
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
              <Badge className="bg-green-100 text-green-800">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date().toLocaleDateString()}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="despachos" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="despachos" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Despachos ({discharges.length})
            </TabsTrigger>
            <TabsTrigger value="asignaciones" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Asignaciones ({assignments.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Despachos */}
          <TabsContent value="despachos" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Despachos del Día</h2>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {discharges.filter((d) => d.status === "finalizado").length} de {discharges.length} completados
              </Badge>
            </div>

            {discharges.length === 0 ? (
              <Card className="text-center">
                <CardContent className="pt-6">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay despachos para hoy</h3>
                  <p className="text-gray-600">Los despachos aparecerán cuando tengas asignaciones activas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {discharges.map((discharge) => (
                  <Card
                    key={discharge.id}
                    className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-blue-500"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">
                          {discharge.customer?.companyname || "Cliente Desconocido"}
                        </CardTitle>
                        <Badge
                          className={
                            discharge.status === "finalizado"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }
                        >
                          {discharge.status === "finalizado" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completado
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Pendiente
                            </>
                          )}
                        </Badge>
                      </div>
                      <CardDescription>RUC: {discharge.customer?.ruc || "N/A"}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Fuel className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Total a descargar:</span>
                        <span className="text-lg font-bold text-green-600">
                          {discharge.totalDischarged.toString()} gal
                        </span>
                      </div>

                      {discharge.marcadorInicial && (
                        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                          <p>Marcador inicial: {discharge.marcadorInicial.toString()} gal</p>
                          {discharge.marcadorFinal && (
                            <>
                              <p>Marcador final: {discharge.marcadorFinal.toString()} gal</p>
                              <p className="font-medium text-blue-600">
                                Cantidad real: {discharge.cantidadReal?.toString() || "N/A"} gal
                              </p>
                            </>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(discharge.createdAt).toLocaleString()}
                      </div>

                      {discharge.status !== "finalizado" && (
                        <Button
                          onClick={() => openModal(discharge)}
                          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                          <Target className="h-4 w-4 mr-2" />
                          Finalizar Despacho
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tab: Asignaciones */}
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

                      {/* Progress Bar */}
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
                        {!assignment.isCompleted && Number(assignment.totalRemaining) > 0 && (
                          <Button
                            onClick={() => openNewDischargeModal(assignment)}
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nuevo Despacho
                          </Button>
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

      {/* Modal para crear nuevo despacho */}
      {showNewDischargeModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-xl">Crear Nuevo Despacho</CardTitle>
              <CardDescription>
                Asignación #{selectedAssignment.id} - {selectedAssignment.truck.placa}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Combustible disponible:
                  <span className="font-bold ml-1">{selectedAssignment.totalRemaining.toString()} gal</span>
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Cliente</Label>
                  <Select
                    value={newDischargeData.customerId}
                    onValueChange={(value) => setNewDischargeData((prev) => ({ ...prev, customerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.companyname} - {customer.ruc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marcadorInicial">Marcador Inicial (Combustible Actual)</Label>
                  <Input
                    id="marcadorInicial"
                    type="number"
                    step="0.01"
                    value={newDischargeData.marcadorInicial}
                    onChange={(e) => setNewDischargeData((prev) => ({ ...prev, marcadorInicial: e.target.value }))}
                    placeholder="Ej: 1000.50"
                  />
                  <p className="text-xs text-gray-500">Este debe coincidir con el combustible actual del camión</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalDischarged">Cantidad a Descargar</Label>
                  <Input
                    id="totalDischarged"
                    type="number"
                    step="0.01"
                    value={newDischargeData.totalDischarged}
                    onChange={(e) => setNewDischargeData((prev) => ({ ...prev, totalDischarged: e.target.value }))}
                    placeholder="Ej: 500.00"
                    max={selectedAssignment.totalRemaining.toString()}
                  />
                </div>

                {newDischargeData.marcadorInicial && newDischargeData.totalDischarged && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <Label className="text-sm text-green-700">Marcador final estimado:</Label>
                    <p className="font-bold text-green-700">{calculateNewDischargeAmount().toFixed(2)} gal</p>
                    <p className="text-xs text-green-600 mt-1">Combustible restante después del despacho</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={closeNewDischargeModal} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={createNewDischarge}
                  disabled={
                    isProcessing ||
                    !newDischargeData.customerId ||
                    !newDischargeData.totalDischarged ||
                    !newDischargeData.marcadorInicial
                  }
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {isProcessing ? "Creando..." : "Crear Despacho"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal para finalizar descarga */}
      {isModalOpen && selectedDischarge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-xl">Finalizar Despacho</CardTitle>
              <CardDescription>
                {selectedDischarge.customer?.companyname} - ID: {selectedDischarge.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Cantidad esperada:
                  <span className="font-bold ml-1">{selectedDischarge.totalDischarged.toString()} gal</span>
                </p>
                {selectedDischarge.marcadorInicial && (
                  <p className="text-sm text-blue-700 font-medium mt-1">
                    Marcador inicial:
                    <span className="font-bold ml-1">{selectedDischarge.marcadorInicial.toString()} gal</span>
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="marcadorInicial">Marcador Inicial</Label>
                  <Input
                    id="marcadorInicial"
                    type="number"
                    step="0.01"
                    value={marcadorInicial}
                    onChange={(e) => setMarcadorInicial(e.target.value)}
                    placeholder="Ej: 1000.50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marcadorFinal">Marcador Final</Label>
                  <Input
                    id="marcadorFinal"
                    type="number"
                    step="0.01"
                    value={marcadorFinal}
                    onChange={(e) => setMarcadorFinal(e.target.value)}
                    placeholder="Ej: 500.25"
                  />
                </div>

                {marcadorInicial && marcadorFinal && (
                  <div className="space-y-2">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <Label className="text-sm text-green-700">Cantidad calculada:</Label>
                      <p className="font-bold text-green-700">{calculateDischargedAmount().toFixed(2)} gal</p>
                      <p className="text-xs text-green-600 mt-1">
                        Diferencia:{" "}
                        {Math.abs(calculateDischargedAmount() - Number(selectedDischarge.totalDischarged)).toFixed(2)}{" "}
                        gal
                      </p>
                    </div>

                    {Math.abs(calculateDischargedAmount() - Number(selectedDischarge.totalDischarged)) >
                      Number(selectedDischarge.totalDischarged) * 0.02 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          La diferencia excede la tolerancia del 2%. Verifique los marcadores antes de continuar.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={closeModal} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={finalizeDischarge}
                  disabled={isProcessing || !marcadorInicial || !marcadorFinal}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {isProcessing ? "Procesando..." : "Finalizar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
