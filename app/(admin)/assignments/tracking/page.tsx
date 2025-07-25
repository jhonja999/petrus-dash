"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, Truck, RefreshCw, Navigation, Clock, User } from "lucide-react"
import axios from "axios"
import { useToast } from "@/hooks/use-toast"

interface Assignment {
  id: number
  driverId: number
  truckId: number
  fuelType: string
  totalLoaded: number
  totalRemaining: number
  isCompleted: boolean
  createdAt: string
  driver: {
    id: number
    name: string
    lastname: string
  }
  truck: {
    id: number
    placa: string
  }
  clientAssignments?: Array<{
    id: number
    status: string
    customer: {
      companyname: string
    }
  }>
}

export default function AssignmentTrackingPage() {
  const { isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  useEffect(() => {
    if (mounted && isAdmin) {
      fetchActiveAssignments()
    }
  }, [mounted, isAdmin])

  const fetchActiveAssignments = async () => {
    try {
      setLoading(true)
      const response = await axios.get("/api/assignments?status=active")

      // Filtrar solo asignaciones activas (no completadas)
      const activeAssignments =
        response.data.assignments?.filter((assignment: Assignment) => !assignment.isCompleted) || []

      setAssignments(activeAssignments)
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las asignaciones activas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchActiveAssignments()
      toast({
        title: "Datos actualizados",
        description: "La lista de asignaciones ha sido actualizada",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar los datos",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const getAssignmentStatus = (assignment: Assignment) => {
    if (assignment.isCompleted) return { text: "Completada", color: "bg-green-100 text-green-800" }

    const pendingDeliveries = assignment.clientAssignments?.filter((ca) => ca.status === "pending").length || 0
    const completedDeliveries = assignment.clientAssignments?.filter((ca) => ca.status === "completed").length || 0

    if (pendingDeliveries === 0 && completedDeliveries > 0) {
      return { text: "Entregas Completadas", color: "bg-blue-100 text-blue-800" }
    } else if (pendingDeliveries > 0) {
      return { text: `${pendingDeliveries} Entregas Pendientes`, color: "bg-yellow-100 text-yellow-800" }
    } else {
      return { text: "En Tránsito", color: "bg-orange-100 text-orange-800" }
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Acceso No Autorizado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tracking de Asignaciones</h1>
          <p className="text-sm text-gray-600">Monitoreo en tiempo real de camiones y conductores en servicio</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-transparent"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Truck className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-600">{assignments.length}</p>
              <p className="text-sm text-gray-600">Asignaciones Activas</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <User className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{new Set(assignments.map((a) => a.driverId)).size}</p>
              <p className="text-sm text-gray-600">Conductores Activos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <MapPin className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">
                {assignments.reduce(
                  (total, assignment) =>
                    total + (assignment.clientAssignments?.filter((ca) => ca.status === "pending").length || 0),
                  0,
                )}
              </p>
              <p className="text-sm text-gray-600">Entregas Pendientes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-600">
                {assignments.reduce(
                  (total, assignment) =>
                    total + (assignment.clientAssignments?.filter((ca) => ca.status === "completed").length || 0),
                  0,
                )}
              </p>
              <p className="text-sm text-gray-600">Entregas Completadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de asignaciones activas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            Asignaciones en Tiempo Real
          </CardTitle>
          <CardDescription>Monitoreo de todas las asignaciones activas y su estado actual</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay asignaciones activas</h3>
              <p className="text-gray-600">
                Todas las asignaciones han sido completadas o no hay asignaciones en curso.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asignación</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Camión</TableHead>
                    <TableHead>Combustible</TableHead>
                    <TableHead>Progreso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Última Actividad</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment) => {
                    const status = getAssignmentStatus(assignment)
                    const progress =
                      ((Number(assignment.totalLoaded) - Number(assignment.totalRemaining)) /
                        Number(assignment.totalLoaded)) *
                      100

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">#{assignment.id}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {assignment.driver.name} {assignment.driver.lastname}
                            </p>
                            <p className="text-xs text-gray-500">ID: {assignment.driver.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{assignment.truck.placa}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {assignment.fuelType}
                            </Badge>
                            <p className="text-xs text-gray-500 mt-1">
                              {assignment.totalRemaining}/{assignment.totalLoaded} gal
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Progreso</span>
                              <span>{progress.toFixed(1)}%</span>
                            </div>
                            <div className="bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={status.color}>{status.text}</Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-gray-500">{new Date(assignment.createdAt).toLocaleDateString()}</p>
                          <p className="text-xs text-gray-400">{new Date(assignment.createdAt).toLocaleTimeString()}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild size="sm" variant="outline" className="text-xs bg-transparent">
                              <a href={`/despacho/${assignment.driverId}`} target="_blank" rel="noopener noreferrer">
                                <MapPin className="h-3 w-3 mr-1" />
                                Ver Panel
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
