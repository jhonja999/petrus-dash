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
import { Progress } from "@/components/ui/progress"
import { TruckIcon, MapPin, Fuel, ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import axios from "axios"
import { formatDate } from "@/lib/date"

interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
}

interface ClientAssignment {
  id: number
  customerId: number
  allocatedQuantity: number | string // Can be Decimal from Prisma
  deliveredQuantity: number | string // Can be Decimal from Prisma
  remainingQuantity: number | string // Can be Decimal from Prisma
  status: string
  customer: Customer
}

interface Assignment {
  id: number
  driver?: {
    id: number
    name: string
    lastname: string
  }
  truck?: {
    id: number
    placa: string
    state: string
  }
  fuelType: string
  totalLoaded: number
  totalRemaining: number
  isCompleted: boolean
  createdAt: string
  clientAssignments?: ClientAssignment[]
}

export default function ClientAssignmentPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [addingClient, setAddingClient] = useState(false)
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null)
  const [newClientAssignment, setNewClientAssignment] = useState({
    customerId: "",
    allocatedQuantity: "",
  })

  const assignmentId = params.id as string

  useEffect(() => {
    fetchAssignment()
    fetchCustomers()
  }, [assignmentId])

  const fetchAssignment = async () => {
    try {
      const response = await axios.get(`/api/assignments/${assignmentId}`)
      console.log("Assignment data:", response.data) // Debug log
      setAssignment(response.data)
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

  const fetchCustomers = async () => {
    try {
      const response = await axios.get("/api/customers")
      setCustomers(response.data)
    } catch (error) {
      console.error("Error fetching customers:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la lista de clientes.",
        variant: "destructive",
      })
    }
  }

  const handleAddClientAssignment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assignment) return

    setAddingClient(true)

    try {
      const allocatedAmount = Number.parseFloat(newClientAssignment.allocatedQuantity)

      // Calculate current total assigned
      const currentTotalAssigned = assignment.clientAssignments
        ? assignment.clientAssignments.reduce((sum, ca) => {
            const quantity =
              typeof ca.allocatedQuantity === "number"
                ? ca.allocatedQuantity
                : Number.parseFloat(String(ca.allocatedQuantity || 0))
            return sum + quantity
          }, 0)
        : 0

      const totalLoaded =
        typeof assignment.totalLoaded === "number"
          ? assignment.totalLoaded
          : Number.parseFloat(String(assignment.totalLoaded))

      const remainingToAssign = Math.max(0, totalLoaded - totalAssigned)

      if (allocatedAmount > remainingToAssign) {
        toast({
          title: "Error de validación",
          description: `No se puede asignar más de ${remainingToAssign.toFixed(2)} galones disponibles.`,
          variant: "destructive",
        })
        return
      }

      await axios.post(`/api/assignments/${assignment.id}/clients`, {
        customerId: Number.parseInt(newClientAssignment.customerId),
        allocatedQuantity: allocatedAmount,
      })

      toast({
        title: "✅ Cliente asignado",
        description: "El cliente se ha asignado exitosamente.",
        className: "border-green-200 bg-green-50",
      })

      setNewClientAssignment({ customerId: "", allocatedQuantity: "" })
      fetchAssignment() // Refresh data
    } catch (error: any) {
      console.error("Error adding client assignment:", error)
      toast({
        title: "❌ Error al asignar cliente",
        description: error.response?.data?.error || "No se pudo asignar el cliente.",
        variant: "destructive",
      })
    } finally {
      setAddingClient(false)
    }
  }

  const handleDeleteClientAssignment = async (clientAssignmentId: number) => {
    if (!assignment) return

    // Find the client assignment to get customer name for toast
    const clientAssignment = assignment.clientAssignments?.find((ca) => ca.id === clientAssignmentId)
    const customerName = clientAssignment?.customer?.companyname || "Cliente"

    setDeletingClientId(clientAssignmentId)

    try {
      await axios.delete(`/api/assignments/${assignment.id}/clients/${clientAssignmentId}`)

      toast({
        title: "🗑️ Cliente eliminado",
        description: `${customerName} ha sido eliminado de la asignación exitosamente.`,
        className: "border-blue-200 bg-blue-50",
      })

      fetchAssignment() // Refresh data
    } catch (error: any) {
      console.error("Error deleting client assignment:", error)
      toast({
        title: "❌ Error al eliminar cliente",
        description: error.response?.data?.error || "No se pudo eliminar la asignación de cliente.",
        variant: "destructive",
      })
    } finally {
      setDeletingClientId(null)
    }
  }

  if (loading) {
    return (
      
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-gray-600">Cargando asignación...</p>
          </div>
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

  // Safe access to nested properties with fallbacks
  const truckPlaca = assignment.truck?.placa || "N/A"
  const truckState = assignment.truck?.state || "Desconocido"
  const driverName = assignment.driver ? `${assignment.driver.name} ${assignment.driver.lastname}` : "N/A"
  const totalLoaded =
    assignment.totalLoaded !== undefined
      ? typeof assignment.totalLoaded === "number"
        ? assignment.totalLoaded
        : Number.parseFloat(String(assignment.totalLoaded))
      : 0

  // Calculate totals correctly
  const totalAssigned = assignment.clientAssignments
    ? assignment.clientAssignments.reduce((sum, ca) => {
        const quantity =
          typeof ca.allocatedQuantity === "number"
            ? ca.allocatedQuantity
            : Number.parseFloat(String(ca.allocatedQuantity || 0))
        return sum + quantity
      }, 0)
    : 0

  const remainingToAssign = Math.max(0, totalLoaded - totalAssigned)
  const assignmentProgress = totalLoaded > 0 ? (totalAssigned / totalLoaded) * 100 : 0

  return (
 
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/assignments`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Asignación #{assignment.id} - Gestión de Clientes</h1>
              <p className="text-gray-600">
                {truckPlaca} - {driverName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
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
                    <p className="text-lg font-semibold">{truckPlaca}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Estado del Camión</Label>
                    <Badge variant="outline">{truckState}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Conductor</Label>
                    <p className="text-lg font-semibold">{driverName}</p>
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
                    <p className="text-lg font-semibold text-orange-600">{assignment.fuelType || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Total Cargado</Label>
                    <p className="text-lg font-semibold text-blue-600">{totalLoaded.toFixed(2)} gal</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Por Asignar</Label>
                    <p className="text-lg font-semibold text-green-600">{remainingToAssign.toFixed(2)} gal</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Assignments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Clientes Asignados
                </CardTitle>
                <CardDescription>Clientes asignados para entrega de combustible</CardDescription>
              </CardHeader>
              <CardContent>
                {!assignment.clientAssignments || assignment.clientAssignments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay clientes asignados</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignment.clientAssignments.map((clientAssignment) => (
                      <div
                        key={clientAssignment.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-200 ${
                          deletingClientId === clientAssignment.id
                            ? "bg-red-50 border-red-200 opacity-75"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{clientAssignment.customer?.companyname || "N/A"}</h4>
                            <Badge variant="outline" className="text-xs">
                              RUC: {clientAssignment.customer?.ruc || "N/A"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Fuel className="h-3 w-3" />
                              {(typeof clientAssignment.allocatedQuantity === "number"
                                ? clientAssignment.allocatedQuantity
                                : Number.parseFloat(String(clientAssignment.allocatedQuantity || 0))
                              ).toFixed(2)}{" "}
                              gal
                            </span>
                            <span className="flex items-center gap-1">
                              <Badge variant={clientAssignment.status === "completed" ? "default" : "outline"}>
                                {clientAssignment.status === "pending" && "Pendiente"}
                                {clientAssignment.status === "in_progress" && "En Progreso"}
                                {clientAssignment.status === "completed" && "Completado"}
                              </Badge>
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Dirección: {clientAssignment.customer?.address || "N/A"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClientAssignment(clientAssignment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors"
                          disabled={clientAssignment.status !== "pending" || deletingClientId === clientAssignment.id}
                        >
                          {deletingClientId === clientAssignment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add New Client Assignment */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Cliente
                </CardTitle>
                <CardDescription>Asignar cliente para entrega</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddClientAssignment} className="space-y-4">
                  <div>
                    <Label htmlFor="customerId">Cliente *</Label>
                    <select
                      id="customerId"
                      value={newClientAssignment.customerId}
                      onChange={(e) => setNewClientAssignment((prev) => ({ ...prev, customerId: e.target.value }))}
                      className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={assignment.isCompleted || addingClient}
                    >
                      <option value="">Seleccionar cliente</option>
                      {customers
                        .filter(
                          (customer) => !assignment.clientAssignments?.some((ca) => ca.customerId === customer.id),
                        )
                        .map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.companyname} - {customer.ruc}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="allocatedQuantity">Cantidad Asignada (Galones) *</Label>
                    <Input
                      id="allocatedQuantity"
                      type="number"
                      step="0.01"
                      min="0"
                      max={remainingToAssign}
                      value={newClientAssignment.allocatedQuantity}
                      onChange={(e) =>
                        setNewClientAssignment((prev) => ({ ...prev, allocatedQuantity: e.target.value }))
                      }
                      placeholder="0.00"
                      required
                      disabled={assignment.isCompleted || remainingToAssign <= 0 || addingClient}
                      className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Máximo disponible: {remainingToAssign.toFixed(2)} gal</p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      assignment.isCompleted ||
                      remainingToAssign <= 0 ||
                      !newClientAssignment.customerId ||
                      addingClient
                    }
                  >
                    {addingClient ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Agregar Cliente
                      </>
                    )}
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
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Cargado:</span>
                    <span className="font-semibold">{totalLoaded.toFixed(2)} gal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Asignado:</span>
                    <span className="font-semibold text-blue-600">{totalAssigned.toFixed(2)} gal</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Por Asignar:</span>
                    <span className="font-semibold text-green-600">{remainingToAssign.toFixed(2)} gal</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Progreso de asignación</span>
                    <span className="text-sm text-gray-600">{assignmentProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={assignmentProgress} className="w-full" />
                </div>

                {remainingToAssign > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Aún quedan <strong>{remainingToAssign.toFixed(2)} galones</strong> por asignar
                    </p>
                  </div>
                )}

                {remainingToAssign === 0 && totalAssigned > 0 && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="h-4 w-4 inline mr-1" />
                      Todo el combustible ha sido asignado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

  )
}
