"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  TruckIcon,
  MapPin,
  Fuel,
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Users,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import axios from "axios"
import { formatDate } from "@/lib/date"

interface Driver {
  id: number
  name: string
  lastname: string
  dni: string
}

interface Truck {
  id: number
  placa: string
  state: string
}

interface Customer {
  id: number
  companyname: string
  ruc: string
}

interface Dispatch {
  id: number
  customer: Customer
  totalDischarged: number | string // Can be Decimal from Prisma
  createdAt: string
}

interface Assignment {
  id: number
  driver?: Driver
  truck?: Truck
  fuelType: string
  totalLoaded: number | string // Can be Decimal from Prisma
  totalRemaining: number | string // Can be Decimal from Prisma
  destination?: string
  notes?: string
  isCompleted: boolean
  createdAt: string
  dispatches?: Dispatch[] // Make dispatches optional
}

export default function AssignmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [newDispatch, setNewDispatch] = useState({
    customerId: "",
    totalDischarged: "",
  })

  const assignmentId = params.id as string

  useEffect(() => {
    fetchAssignment()
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      const response = await axios.get(`/api/assignments/${assignmentId}`)

      // Ensure dispatches is always an array
      const assignmentData = response.data
      if (!assignmentData.dispatches) {
        assignmentData.dispatches = []
      }

      setAssignment(assignmentData)
    } catch (error) {
      console.error("Error fetching assignment:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la asignación.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddDispatch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assignment) return

    const dischargedAmount = Number.parseFloat(newDispatch.totalDischarged)
    const currentRemaining =
      typeof assignment.totalRemaining === "number"
        ? assignment.totalRemaining
        : Number.parseFloat(String(assignment.totalRemaining))

    if (dischargedAmount > currentRemaining) {
      toast({
        title: "Error",
        description: `No se puede descargar más de ${currentRemaining.toFixed(2)} galones disponibles.`,
        variant: "destructive",
      })
      return
    }

    try {
      await axios.post(`/api/despacho/${assignment.driver?.id}`, {
        assignmentId: assignment.id,
        customerId: Number.parseInt(newDispatch.customerId),
        totalDischarged: dischargedAmount,
      })

      toast({
        title: "Despacho agregado",
        description: "El despacho se ha registrado exitosamente.",
      })

      setNewDispatch({ customerId: "", totalDischarged: "" })
      fetchAssignment() // Refresh data
    } catch (error: unknown) {
      console.error("Error adding dispatch:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar el despacho.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteDispatch = async (dispatchId: number) => {
    try {
      await axios.delete(`/api/discharges/${dispatchId}`)

      toast({
        title: "Despacho eliminado",
        description: "El despacho se ha eliminado exitosamente.",
      })

      fetchAssignment() // Refresh data
    } catch (error) {
      console.error("Error deleting dispatch:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el despacho.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    )
  }

  if (!assignment) {
    return (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Asignación no encontrada</h2>
          <p className="text-gray-600 mt-2">La asignación solicitada no existe.</p>
          <Button asChild className="mt-4">
            <Link href="/assignments">Volver a Asignaciones</Link>
          </Button>
        </div>
    )
  }

  // Ensure dispatches is always an array
  const dispatches = assignment.dispatches || []

  // Safe conversion of Decimal/string values to numbers
  const totalLoaded =
    typeof assignment.totalLoaded === "number"
      ? assignment.totalLoaded
      : Number.parseFloat(String(assignment.totalLoaded || 0))

  const totalRemaining =
    typeof assignment.totalRemaining === "number"
      ? assignment.totalRemaining
      : Number.parseFloat(String(assignment.totalRemaining || 0))

  // Calculate total discharged amount
  const totalDischarged = dispatches.reduce((sum, d) => {
    const amount =
      typeof d.totalDischarged === "number" ? d.totalDischarged : Number.parseFloat(String(d.totalDischarged || 0))
    return sum + amount
  }, 0)

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/assignments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asignación #{assignment.id}</h1>
              <p className="text-gray-600">
                {assignment.truck?.placa || "N/A"} -{" "}
                {assignment.driver ? `${assignment.driver.name} ${assignment.driver.lastname}` : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" asChild className="mr-2">
              <Link href={`/assignments/${assignment.id}/clients`}>
                <Users className="h-4 w-4 mr-2" />
                Gestionar Clientes
              </Link>
            </Button>
            {assignment.isCompleted ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completado
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">
                <AlertCircle className="h-3 w-3 mr-1" />
                En Progreso
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignment Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TruckIcon className="h-5 w-5 text-blue-600" />
                  Detalles de la Asignación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Camión</Label>
                    <p className="text-lg font-semibold">{assignment.truck?.placa || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Estado del Camión</Label>
                    <Badge variant="outline">{assignment.truck?.state || "Desconocido"}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Conductor</Label>
                    <p className="text-lg font-semibold">
                      {assignment.driver ? `${assignment.driver.name} ${assignment.driver.lastname}` : "N/A"}
                    </p>
                    {assignment.driver?.dni && <p className="text-sm text-gray-600">DNI: {assignment.driver.dni}</p>}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Fecha de Creación</Label>
                    <p className="text-lg font-semibold">{formatDate(new Date(assignment.createdAt))}</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Tipo de Combustible</Label>
                    <p className="text-lg font-semibold text-orange-600">{assignment.fuelType}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Total Cargado</Label>
                    <p className="text-lg font-semibold text-blue-600">{totalLoaded.toFixed(2)} gal</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Remanente</Label>
                    <p className="text-lg font-semibold text-green-600">{totalRemaining.toFixed(2)} gal</p>
                  </div>
                </div>

                {assignment.notes && (
                  <>
                    <Separator />
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Notas</Label>
                      <p className="text-gray-700">{assignment.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Dispatches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Despachos Realizados
                </CardTitle>
                <CardDescription>Historial de entregas de combustible a clientes</CardDescription>
              </CardHeader>
              <CardContent>
                {dispatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay despachos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dispatches.map((dispatch) => {
                      const dischargedAmount =
                        typeof dispatch.totalDischarged === "number"
                          ? dispatch.totalDischarged
                          : Number.parseFloat(String(dispatch.totalDischarged || 0))

                      return (
                        <div key={dispatch.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{dispatch.customer.companyname}</h4>
                              <Badge variant="outline" className="text-xs">
                                RUC: {dispatch.customer.ruc}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Fuel className="h-3 w-3" />
                                {dischargedAmount.toFixed(2)} gal
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(new Date(dispatch.createdAt))}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteDispatch(dispatch.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add New Dispatch */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Despacho
                </CardTitle>
                <CardDescription>Registrar entrega a cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddDispatch} className="space-y-4">
                  <div>
                    <Label htmlFor="customerId">Cliente *</Label>
                    <select
                      id="customerId"
                      value={newDispatch.customerId}
                      onChange={(e) => setNewDispatch((prev) => ({ ...prev, customerId: e.target.value }))}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Seleccionar cliente</option>
                      <option value="1">Empresa ABC S.A.C.</option>
                      <option value="2">Transportes XYZ E.I.R.L.</option>
                      <option value="3">Comercial DEF S.R.L.</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="totalDischarged">Cantidad Descargada (Galones) *</Label>
                    <Input
                      id="totalDischarged"
                      type="number"
                      step="0.01"
                      min="0"
                      max={totalRemaining}
                      value={newDispatch.totalDischarged}
                      onChange={(e) => setNewDispatch((prev) => ({ ...prev, totalDischarged: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo disponible: {totalRemaining.toFixed(2)} gal</p>
                  </div>

                  <Button type="submit" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Despacho
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5 text-orange-600" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Cargado:</span>
                  <span className="font-semibold">{totalLoaded.toFixed(2)} gal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Despachado:</span>
                  <span className="font-semibold">{totalDischarged.toFixed(2)} gal</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Remanente:</span>
                  <span className="font-semibold text-green-600">{totalRemaining.toFixed(2)} gal</span>
                </div>

                {/* Truck capacity info */}
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-700">
                    <TruckIcon className="h-4 w-4 inline mr-1" />
                    Capacidad máxima del camión: 3000 gal
                  </p>
                  {totalRemaining <= 0 && (
                    <p className="text-sm text-orange-700 mt-1">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Camión vacío. Listo para recarga.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
  )
}
