"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { DischargeForm } from "@/components/DischargeForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, MapPin, Fuel, Clock, ArrowLeft, CheckCircle, AlertTriangle, Info } from "lucide-react"
import { formatDateTime } from "@/lib/date"
import axios from "axios"
import type { Assignment, Discharge, Customer } from "@/types/globals"

export default function AssignmentDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const driverId = params.driverId as string
  const assignmentId = params.assignmentId as string
  const { user, isConductor, isLoading } = useAuth()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDischarge, setSelectedDischarge] = useState<Discharge | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const driverIdNumber = driverId ? Number.parseInt(driverId, 10) : null

  useEffect(() => {
    if (!isLoading && (!isConductor || !user || !driverIdNumber || Number(user.id) !== driverIdNumber)) {
      window.location.href = "/unauthorized"
      return
    }

    const fetchData = async () => {
      try {
        setError(null)
        const [assignmentRes, customersRes] = await Promise.all([
          axios.get(`/api/assignments/${assignmentId}`),
          axios.get("/api/customers"),
        ])

        setAssignment(assignmentRes.data)
        setCustomers(customersRes.data)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Error al cargar los datos. Por favor, intenta de nuevo.")
      } finally {
        setLoading(false)
      }
    }

    if (assignmentId && driverId) {
      fetchData()
    }
  }, [assignmentId, driverId, user, isConductor, isLoading, router, driverIdNumber])

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

  const calculateDischargedAmount = () => {
    const inicial = Number.parseFloat(marcadorInicial) || 0
    const final = Number.parseFloat(marcadorFinal) || 0
    return inicial - final
  }

  const finalizeDischarge = async () => {
    if (!selectedDischarge || !marcadorInicial || !marcadorFinal) {
      alert("Por favor complete todos los campos")
      return
    }

    const cantidadDepositada = calculateDischargedAmount()
    const cantidadEsperada = Number(selectedDischarge.totalDischarged)
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

      // Update assignment data
      if (assignment) {
        const updatedDischarges = assignment.discharges.map((d) => (d.id === selectedDischarge.id ? response.data : d))
        setAssignment({
          ...assignment,
          discharges: updatedDischarges,
        })
      }

      alert("Descarga finalizada correctamente")
      closeModal()
    } catch (error) {
      console.error("Error finalizing discharge:", error)
      alert("Error al finalizar la descarga")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleNewDischarge = () => {
    // Refresh assignment data
    window.location.reload()
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando detalles...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push(`/despacho/${driverId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a mis asignaciones
          </Button>
        </div>
      </div>
    )
  }

  if (!isConductor || !assignment) {
    return null
  }

  const completedDischarges = assignment.discharges.filter((d) => d.status === "finalizado").length
  const totalDischarges = assignment.discharges.length
  const totalDischarged = assignment.discharges
    .filter((d) => d.status === "finalizado")
    .reduce((sum, d) => sum + Number(d.cantidadReal || d.totalDischarged), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button onClick={() => router.push(`/despacho/${driverId}`)} variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <Truck className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Detalles de Asignación - {assignment.truck.placa}</h1>
                  <p className="text-sm text-gray-600">
                    {assignment.fuelType} • {formatDateTime(assignment.createdAt)}
                  </p>
                </div>
              </div>
            </div>
            <Badge className={assignment.isCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
              {assignment.isCompleted ? "Completado" : "En Progreso"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignment Summary */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-blue-600" />
                  Resumen de Combustible
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total Cargado</p>
                    <p className="text-2xl font-bold text-blue-700">{assignment.totalLoaded.toString()} gal</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Descargado</p>
                    <p className="text-2xl font-bold text-green-700">{totalDischarged.toFixed(2)} gal</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-orange-600 font-medium">Remanente</p>
                    <p className="text-2xl font-bold text-orange-700">{assignment.totalRemaining.toString()} gal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Discharges Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-green-600" />
                    Descargas ({completedDischarges}/{totalDischarges})
                  </span>
                  <Badge variant="outline">
                    {totalDischarges > 0 ? ((completedDischarges / totalDischarges) * 100).toFixed(0) : 0}% Completado
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {assignment.discharges.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p>No hay descargas registradas para esta asignación</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Cantidad</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Marcadores</TableHead>
                          <TableHead>Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignment.discharges.map((discharge) => (
                          <TableRow key={discharge.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{discharge.customer.companyname}</p>
                                <p className="text-sm text-gray-500">{discharge.customer.ruc}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-semibold">{discharge.totalDischarged.toString()} gal</p>
                                {discharge.cantidadReal && (
                                  <p className="text-sm text-blue-600">Real: {discharge.cantidadReal.toString()} gal</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
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
                                    Finalizado
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pendiente
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {discharge.marcadorInicial && discharge.marcadorFinal ? (
                                <div className="text-sm">
                                  <p>Inicial: {discharge.marcadorInicial.toString()}</p>
                                  <p>Final: {discharge.marcadorFinal.toString()}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">No registrado</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {discharge.status !== "finalizado" ? (
                                <Button
                                  onClick={() => openModal(discharge)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Finalizar
                                </Button>
                              ) : (
                                <Button onClick={() => openModal(discharge)} size="sm" variant="outline">
                                  Ver Detalles
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Add New Discharge */}
            <DischargeForm assignmentId={assignment.id} customers={customers} onSuccess={handleNewDischarge} />

            {/* Assignment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  Información
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Camión</Label>
                  <p className="font-semibold">{assignment.truck.placa}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Capacidad</Label>
                  <p className="font-semibold">{assignment.truck.capacitygal.toString()} gal</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Tipo de Combustible</Label>
                  <Badge variant="outline">{assignment.fuelType}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Fecha de Asignación</Label>
                  <p className="text-sm">{formatDateTime(assignment.createdAt)}</p>
                </div>
                {assignment.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Notas</Label>
                    <p className="text-sm bg-gray-50 p-2 rounded">{assignment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal for Discharge Details */}
      {isModalOpen && selectedDischarge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-xl">
                {selectedDischarge.status === "finalizado" ? "Detalles de Descarga" : "Finalizar Descarga"}
              </CardTitle>
              <CardDescription>
                {selectedDischarge.customer.companyname} - ID: {selectedDischarge.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">
                  Cantidad programada:
                  <span className="font-bold ml-1">{selectedDischarge.totalDischarged.toString()} gal</span>
                </p>
              </div>

              {selectedDischarge.status === "finalizado" ? (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium">Marcador Inicial</Label>
                    <p className="font-semibold">{selectedDischarge.marcadorInicial?.toString() || "N/A"}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium">Marcador Final</Label>
                    <p className="font-semibold">{selectedDischarge.marcadorFinal?.toString() || "N/A"}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <Label className="text-sm font-medium text-green-700">Cantidad Real Descargada</Label>
                    <p className="font-bold text-green-700">
                      {selectedDischarge.cantidadReal?.toString() || "N/A"} gal
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Finalizado: {formatDateTime(selectedDischarge.updatedAt)}
                  </div>
                </div>
              ) : (
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
              )}

              <div className="flex gap-3 pt-4">
                <Button onClick={closeModal} variant="outline" className="flex-1">
                  Cerrar
                </Button>
                {selectedDischarge.status !== "finalizado" && (
                  <Button
                    onClick={finalizeDischarge}
                    disabled={isProcessing || !marcadorInicial || !marcadorFinal}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                  >
                    {isProcessing ? "Procesando..." : "Finalizar"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
