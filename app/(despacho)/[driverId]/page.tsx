"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, MapPin, Fuel, Clock } from "lucide-react"
import axios from "axios"
import type { Discharge } from "@/types"

export default function DriverDashboard() {
  const params = useParams()
  const driverId = params.driverId as string
  const driverIdNumber = driverId ? Number.parseInt(driverId, 10) : null
  const { user, isConductor, isLoading } = useAuth()
  const [discharges, setDischarges] = useState<Discharge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDischarge, setSelectedDischarge] = useState<Discharge | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [marcadorInicial, setMarcadorInicial] = useState("")
  const [marcadorFinal, setMarcadorFinal] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isLoading && (!isConductor || !user || !driverIdNumber || Number(user.id) !== driverIdNumber)) {
      window.location.href = "/unauthorized"
      return
    }

    const fetchDischarges = async () => {
      if (!driverIdNumber) return

      try {
        const response = await axios.get(`/api/despacho/${driverIdNumber}`)
        setDischarges(response.data)
      } catch (error) {
        console.error("Error fetching discharges:", error)
      } finally {
        setLoading(false)
      }
    }

    if (driverIdNumber) {
      fetchDischarges()
    }
  }, [driverIdNumber, user, isConductor, isLoading])

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
      const response = await axios.put(`/api/despacho/assignment/${selectedDischarge.id}`, {
        status: "finalizado",
        marcadorInicial: Number.parseFloat(marcadorInicial),
        marcadorFinal: Number.parseFloat(marcadorFinal),
        cantidadReal: cantidadDepositada,
      })

      setDischarges((prev) => prev.map((d) => (d.id === selectedDischarge.id ? response.data : d)))

      alert("Despacho finalizado correctamente")
      closeModal()
    } catch (error) {
      console.error("Error finalizing discharge:", error)
      alert("Error al finalizar el despacho")
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando despachos...</p>
        </div>
      </div>
    )
  }

  if (!isConductor) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Mis Despachos</h1>
                <p className="text-sm text-gray-600">
                  {user?.name} {user?.lastname}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800">
                <Clock className="h-3 w-3 mr-1" />
                {new Date().toLocaleDateString()}
              </Badge>
              <Button asChild variant="outline" size="sm">
                <a href="/api/auth/logout">Salir</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {discharges.length === 0 ? (
          <Card className="text-center">
            <CardContent className="pt-6">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay despachos para hoy</h3>
              <p className="text-gray-600">Contacta con el administrador para obtener asignaciones</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Despachos del día</h2>
              <p className="text-gray-600">
                {discharges.length} despacho{discharges.length !== 1 ? "s" : ""} asignado
                {discharges.length !== 1 ? "s" : ""}
              </p>
            </div>

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
                        {discharge.status === "finalizado" ? "Completado" : "Pendiente"}
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

                    {discharge.status === "finalizado" && (
                      <div className="border-t pt-3 space-y-2">
                        <div className="text-xs text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Marcador inicial:</span>
                            <span className="font-medium">{discharge.marcadorInicial?.toString() || "N/A"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Marcador final:</span>
                            <span className="font-medium">{discharge.marcadorFinal?.toString() || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span>Cantidad real:</span>
                            <span className="font-bold text-blue-600">
                              {discharge.cantidadReal?.toString() || "N/A"} gal
                            </span>
                          </div>
                        </div>
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
                        Finalizar Despacho
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal */}
      {isModalOpen && selectedDischarge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-xl">
                {selectedDischarge.status === "finalizado" ? "Detalles del Despacho" : "Finalizar Despacho"}
              </CardTitle>
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
                    <div className="bg-green-50 p-4 rounded-lg">
                      <Label className="text-sm text-green-700">Cantidad calculada:</Label>
                      <p className="font-bold text-green-700">{calculateDischargedAmount().toFixed(2)} gal</p>
                      <p className="text-xs text-green-600 mt-1">
                        Diferencia:{" "}
                        {Math.abs(
                          calculateDischargedAmount() - Number.parseFloat(selectedDischarge.totalDischarged.toString()),
                        ).toFixed(2)}{" "}
                        gal
                      </p>
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