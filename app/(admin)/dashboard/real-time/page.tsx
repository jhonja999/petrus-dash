"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert as UIAlert, AlertDescription } from "@/components/ui/alert"
import {
  Truck,
  Users,
  Package,
  Fuel,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Search,
  Bell,
  MapPin,
  User,
} from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

interface Metrics {
  fleet: {
    total: number
    active: number
    inactive: number
    utilization: number
  }
  dispatches: {
    total: number
    active: number
    completedToday: number
    efficiency: number
    byStatus: Record<string, number>
  }
  drivers: {
    total: number
    active: number
    inactive: number
    availability: number
  }
  customers: {
    total: number
  }
  fuel: {
    low: number
    medium: number
    high: number
    average: number
  }
  recent: {
    dispatches: Array<{
      id: string
      number: string
      status: string
      customer: string
      truck: string
      fuelLevel: number
      createdAt: string
      progress: number
    }>
  }
  distribution: {
    trucksByStatus: Record<string, number>
    fuelLevels: {
      low: number
      medium: number
      high: number
    }
  }
  timestamp: string
}

interface AlertData {
  id: string
  type: string
  priority: "high" | "medium" | "low"
  title: string
  message: string
  data: any
  timestamp: string
  icon: string
}

interface DriverLocationData {
  id: number
  name: string
  lastname: string
  currentLatitude: number | null
  currentLongitude: number | null
  lastLocationUpdate: string | null
}

export default function RealTimeDashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [driversLocation, setDriversLocation] = useState<DriverLocationData[]>([]) // Nuevo estado para ubicaciones de conductores
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // segundos
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [alertFilter, setAlertFilter] = useState("all")
  const [alertSearch, setAlertSearch] = useState("")

  // Función para obtener métricas
  const fetchMetrics = async () => {
    try {
      const response = await fetch("/api/dashboard/real-time")

      if (!response.ok) {
        throw new Error("Error al obtener métricas")
      }

      const result = await response.json()
      if (result.success) {
        setMetrics(result.data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error("Error fetching metrics:", error)
      toast.error("No se pudieron cargar las métricas")
    }
  }

  // Función para obtener alertas
  const fetchAlerts = async () => {
    try {
      const response = await fetch("/api/dashboard/alerts")

      if (!response.ok) {
        throw new Error("Error al obtener alertas")
      }

      const result = await response.json()
      if (result.success) {
        setAlerts(result.data || [])
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    }
  }

  // Función para obtener ubicaciones de conductores
  const fetchDriversLocation = async () => {
    try {
      // Asumiendo que /api/users puede filtrar por rol y devolver ubicación
      const response = await fetch("/api/users?role=OPERADOR")

      if (!response.ok) {
        throw new Error("Error al obtener ubicaciones de conductores")
      }

      const result = await response.json()
      if (result.success) {
        setDriversLocation(result.data.filter((driver: any) => driver.currentLatitude && driver.currentLongitude))
      }
    } catch (error) {
      console.error("Error fetching drivers location:", error)
      toast.error("No se pudieron cargar las ubicaciones de los conductores")
    }
  }

  // Función para manejar acciones de alertas
  const handleAlertAction = async (alertId: string, action: string) => {
    try {
      const response = await fetch("/api/dashboard/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId, action }),
      })

      if (!response.ok) {
        throw new Error("Error al procesar la acción")
      }

      // Remover la alerta de la lista
      setAlerts((prev) => prev.filter((alert) => alert.id !== alertId))

      toast.success(`Alerta ${action === "dismiss" ? "descartada" : "resuelta"} correctamente`)
    } catch (error) {
      console.error("Error handling alert action:", error)
      toast.error("No se pudo procesar la acción")
    }
  }

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchMetrics(), fetchAlerts(), fetchDriversLocation()]) // Incluir fetchDriversLocation
      setLoading(false)
    }

    loadData()
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchMetrics()
      fetchAlerts()
      fetchDriversLocation() // Auto-refresh drivers location
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Filtrar alertas
  const filteredAlerts = alerts.filter((alert) => {
    const matchesFilter = alertFilter === "all" || alert.priority === alertFilter
    const matchesSearch =
      alertSearch === "" ||
      alert.title.toLowerCase().includes(alertSearch.toLowerCase()) ||
      alert.message.toLowerCase().includes(alertSearch.toLowerCase())

    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETADO":
        return "bg-green-500"
      case "EN_RUTA":
        return "bg-blue-500"
      case "PROGRAMADO":
        return "bg-yellow-500"
      case "CANCELADO":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Cargando dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard en Tiempo Real</h1>
          <p className="text-muted-foreground">Monitoreo en vivo de la flota y operaciones</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <span className="text-sm">Auto-refresh</span>
          </div>

          <Select
            value={refreshInterval.toString()}
            onValueChange={(value) => setRefreshInterval(Number.parseInt(value))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10s</SelectItem>
              <SelectItem value="30">30s</SelectItem>
              <SelectItem value="60">1m</SelectItem>
              <SelectItem value="300">5m</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchMetrics()
              fetchAlerts()
              fetchDriversLocation() // Manual refresh drivers location
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Última actualización */}
      {lastUpdate && (
        <div className="text-sm text-muted-foreground">Última actualización: {lastUpdate.toLocaleTimeString()}</div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="fleet">Flota</TabsTrigger>
          <TabsTrigger value="dispatches">Despachos</TabsTrigger>
          <TabsTrigger value="drivers">Conductores</TabsTrigger> {/* Nuevo tab */}
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Métricas principales */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flota Total</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.fleet?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.fleet?.active || 0} activos ({metrics?.fleet?.utilization || 0}%)
                </p>
                <Progress value={metrics?.fleet?.utilization || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despachos Hoy</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.dispatches?.completedToday || 0}</div>
                <p className="text-xs text-muted-foreground">{metrics?.dispatches?.active || 0} en progreso</p>
                <Progress value={metrics?.dispatches?.efficiency || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conductores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.drivers?.total || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.drivers?.active || 0} activos ({metrics?.drivers?.availability || 0}%)
                </p>
                <Progress value={metrics?.drivers?.availability || 0} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Combustible Promedio</CardTitle>
                <Fuel className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics?.fuel?.average || 0}%</div>
                <p className="text-xs text-muted-foreground">{metrics?.fuel?.low || 0} camiones con combustible bajo</p>
                <Progress value={metrics?.fuel?.average || 0} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Despachos recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Despachos Recientes</CardTitle>
              <CardDescription>Últimos 10 despachos del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.recent?.dispatches?.map((dispatch) => (
                  <div key={dispatch.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(dispatch.status)}`} />
                      <div>
                        <p className="font-medium">#{dispatch.number}</p>
                        <p className="text-sm text-muted-foreground">
                          {dispatch.customer} • {dispatch.truck}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <Badge variant="outline">{dispatch.status}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Combustible: {dispatch.fuelLevel}%</p>
                      </div>
                      <div className="w-24">
                        <Progress value={dispatch.progress} />
                      </div>
                    </div>
                  </div>
                )) || <div className="text-center py-8 text-muted-foreground">No hay despachos recientes</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          {/* Distribución de la flota */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estado de la Flota</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics?.distribution?.trucksByStatus || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <span className="capitalize">{status.toLowerCase()}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Niveles de Combustible</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">Bajo (&lt; 25%)</span>
                    <Badge variant="destructive">{metrics?.fuel?.low || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-600">Medio (25-75%)</span>
                    <Badge variant="default">{metrics?.fuel?.medium || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600">Alto (&gt; 75%)</span>
                    <Badge variant="secondary">{metrics?.fuel?.high || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dispatches" className="space-y-6">
          {/* Estadísticas de despachos */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{metrics?.dispatches?.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>En Progreso</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{metrics?.dispatches?.active || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eficiencia Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{metrics?.dispatches?.efficiency || 0}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Distribución por estado */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Estado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(metrics?.dispatches?.byStatus || {}).map(([status, count]) => (
                  <div key={status} className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {status.toLowerCase().replace("_", " ")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Nuevo Tab: Conductores */}
        <TabsContent value="drivers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Ubicación de Conductores en Tiempo Real
              </CardTitle>
              <CardDescription>Última ubicación conocida de los conductores activos.</CardDescription>
            </CardHeader>
            <CardContent>
              {driversLocation.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay conductores con ubicación activa.</div>
              ) : (
                <div className="space-y-4">
                  {driversLocation.map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">
                            {driver.name} {driver.lastname}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Lat: {driver.currentLatitude?.toFixed(4)}°, Lng: {driver.currentLongitude?.toFixed(4)}°
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {driver.lastLocationUpdate && (
                          <p className="text-xs text-muted-foreground">
                            Actualizado:{" "}
                            {formatDistanceToNow(new Date(driver.lastLocationUpdate), { addSuffix: true, locale: es })}
                          </p>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 bg-transparent"
                          onClick={() => {
                            if (driver.currentLatitude && driver.currentLongitude) {
                              window.open(
                                `https://www.google.com/maps?q=${driver.currentLatitude},${driver.currentLongitude}`,
                                "_blank",
                              )
                            } else {
                              toast.info("Ubicación no disponible para este conductor.")
                            }
                          }}
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          Ver en Mapa
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {/* Filtros de alertas */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4" />
              <Select value={alertFilter} onValueChange={setAlertFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta prioridad</SelectItem>
                  <SelectItem value="medium">Media prioridad</SelectItem>
                  <SelectItem value="low">Baja prioridad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4" />
              <Input
                placeholder="Buscar alertas..."
                value={alertSearch}
                onChange={(e) => setAlertSearch(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <Badge variant="outline">{filteredAlerts.length} alertas</Badge>
          </div>

          {/* Lista de alertas */}
          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No hay alertas</h3>
                    <p className="text-muted-foreground">Todo está funcionando correctamente</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAlerts.map((alert) => (
                <UIAlert key={alert.id} className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {alert.priority === "high" && <AlertTriangle className="h-5 w-5 text-red-500" />}
                        {alert.priority === "medium" && <Clock className="h-5 w-5 text-yellow-500" />}
                        {alert.priority === "low" && <Bell className="h-5 w-5 text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{alert.title}</h4>
                          <Badge variant={getPriorityColor(alert.priority)}>{alert.priority}</Badge>
                        </div>
                        <AlertDescription>{alert.message}</AlertDescription>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleAlertAction(alert.id, "dismiss")}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Descartar
                      </Button>
                      <Button variant="default" size="sm" onClick={() => handleAlertAction(alert.id, "resolve")}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    </div>
                  </div>
                </UIAlert>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
