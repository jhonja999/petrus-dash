"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapPin, Truck, RefreshCw, Navigation, Clock, User, Wifi, WifiOff, AlertTriangle } from "lucide-react"
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

interface DriverLocation {
  driverId: number
  latitude: number
  longitude: number
  timestamp: Date
  assignmentId?: number
  status: 'active' | 'inactive'
  driverName?: string
  timeSinceUpdate: number
}

export default function AssignmentTrackingPage() {
  const { isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [driverLocations, setDriverLocations] = useState<DriverLocation[]>([])
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
      fetchDriverLocations()
    }
  }, [mounted, isAdmin])

  // Actualizar ubicaciones cada 30 segundos
  useEffect(() => {
    if (mounted && isAdmin) {
      const interval = setInterval(() => {
        fetchDriverLocations()
      }, 30000)

      return () => clearInterval(interval)
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

  const fetchDriverLocations = async () => {
    try {
      const response = await axios.get("/api/despacho/all/location")
      if (response.data.success) {
        setDriverLocations(response.data.locations || [])
      }
    } catch (error) {
      console.error("Error fetching driver locations:", error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchActiveAssignments(), fetchDriverLocations()])
      toast({
        title: "Datos actualizados",
        description: "La lista de asignaciones y ubicaciones ha sido actualizada",
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

  const formatLocationTimeAgo = (timeSinceUpdate: number) => {
    const minutes = Math.floor(timeSinceUpdate / (1000 * 60))
    
    if (minutes < 1) return "Ahora mismo"
    if (minutes < 60) return `Hace ${minutes} min`
    if (minutes < 1440) return `Hace ${Math.floor(minutes / 60)}h`
    return `Hace ${Math.floor(minutes / 1440)}d`
  }

  const getLocationStatus = (timeSinceUpdate: number) => {
    if (timeSinceUpdate < 5 * 60 * 1000) { // Menos de 5 minutos
      return { label: "Activo", variant: "default" as const, icon: Wifi }
    } else if (timeSinceUpdate < 15 * 60 * 1000) { // Menos de 15 minutos
      return { label: "Reciente", variant: "secondary" as const, icon: Clock }
    } else {
      return { label: "Inactivo", variant: "destructive" as const, icon: WifiOff }
    }
  }

  const getDriverLocation = (driverId: number) => {
    return driverLocations.find(location => location.driverId === driverId)
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

      {/* Ubicaciones en Tiempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Ubicaciones en Tiempo Real
          </CardTitle>
          <CardDescription>
            Conductores activos con tracking de ubicación ({driverLocations.length} activos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {driverLocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <WifiOff className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay conductores con tracking activo</p>
              <p className="text-sm">Los conductores aparecerán aquí cuando inicien un despacho</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {driverLocations.map((location) => {
                const status = getLocationStatus(location.timeSinceUpdate)
                const StatusIcon = status.icon
                
                return (
                  <div key={location.driverId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{location.driverName}</span>
                      </div>
                      <Badge variant={status.variant} className="text-xs">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Latitud:</span>
                        <span className="font-mono">{location.latitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Longitud:</span>
                        <span className="font-mono">{location.longitude.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Última actualización:</span>
                        <span className="text-xs">{formatLocationTimeAgo(location.timeSinceUpdate)}</span>
                      </div>
                      {location.assignmentId && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Asignación:</span>
                          <span className="text-xs">#{location.assignmentId}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => {
                          const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                          window.open(url, '_blank')
                        }}
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Ver en Google Maps
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
                    <TableHead>Ubicación</TableHead>
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
                          {(() => {
                            const location = getDriverLocation(assignment.driverId)
                            if (!location) {
                              return (
                                <div className="text-center">
                                  <WifiOff className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                                  <p className="text-xs text-gray-500">Sin tracking</p>
                                </div>
                              )
                            }
                            
                            const locationStatus = getLocationStatus(location.timeSinceUpdate)
                            const StatusIcon = locationStatus.icon
                            
                            return (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  <span className="text-xs">{formatLocationTimeAgo(location.timeSinceUpdate)}</span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-6 px-2"
                                  onClick={() => {
                                    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                                    window.open(url, '_blank')
                                  }}
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
                                  Ver
                                </Button>
                              </div>
                            )
                          })()}
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
