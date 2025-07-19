"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Truck,
  Fuel,
  MapPin,
  Camera,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Users,
  Navigation,
  Zap,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface DashboardMetrics {
  totalDispatches: number
  gallonsDispatched: number
  dailyRevenue: number
  activeDrivers: number
  activeTrucks: number
  completedDeliveries: number
  pendingDeliveries: number
  fuelDistribution: { [key: string]: number }
  recentDispatches: any[]
  alerts: any[]
}

export function PetrusDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/metrics')
      if (!response.ok) throw new Error('Error fetching metrics')
      
      const data = await response.json()
      setMetrics(data)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error("Error al cargar métricas del dashboard")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchDashboardData()
    toast.info("Actualizando dashboard...")
  }

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Petrus</h1>
          <p className="text-gray-600">Sistema de gestión de despachos de combustible</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Última actualización: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Despachos Hoy</p>
                <p className="text-3xl font-bold text-blue-600">{metrics?.totalDispatches || 0}</p>
                <p className="text-xs text-gray-500">
                  {metrics?.completedDeliveries || 0} completados
                </p>
              </div>
              <FileText className="h-12 w-12 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Galones Despachados</p>
                <p className="text-3xl font-bold text-green-600">
                  {(metrics?.gallonsDispatched || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">galones</p>
              </div>
              <Fuel className="h-12 w-12 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ingresos del Día</p>
                <p className="text-3xl font-bold text-purple-600">
                  S/ {(metrics?.dailyRevenue || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">soles</p>
              </div>
              <DollarSign className="h-12 w-12 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Flota Activa</p>
                <p className="text-3xl font-bold text-orange-600">
                  {metrics?.activeTrucks || 0}/{15}
                </p>
                <p className="text-xs text-gray-500">camiones operativos</p>
              </div>
              <Truck className="h-12 w-12 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {metrics?.alerts && metrics.alerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.alerts.map((alert, index) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{alert.message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="fleet">Gestión de Flota</TabsTrigger>
          <TabsTrigger value="dispatches">Despachos</TabsTrigger>
          <TabsTrigger value="analytics">Análisis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Progreso del Día
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Entregas Completadas</span>
                    <span className="text-sm text-gray-600">
                      {metrics?.completedDeliveries || 0} de {(metrics?.completedDeliveries || 0) + (metrics?.pendingDeliveries || 0)}
                    </span>
                  </div>
                  <Progress 
                    value={
                      ((metrics?.completedDeliveries || 0) / 
                      Math.max(1, (metrics?.completedDeliveries || 0) + (metrics?.pendingDeliveries || 0))) * 100
                    } 
                    className="h-3"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Conductores Activos</span>
                    <span className="text-sm text-gray-600">{metrics?.activeDrivers || 0} de 15</span>
                  </div>
                  <Progress 
                    value={((metrics?.activeDrivers || 0) / 15) * 100} 
                    className="h-3"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Flota Operativa</span>
                    <span className="text-sm text-gray-600">{metrics?.activeTrucks || 0} de 15</span>
                  </div>
                  <Progress 
                    value={((metrics?.activeTrucks || 0) / 15) * 100} 
                    className="h-3"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Fuel Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Distribución de Combustibles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.fuelDistribution && Object.entries(metrics.fuelDistribution).map(([fuel, percentage]) => (
                    <div key={fuel} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{fuel}</span>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                      <Progress value={percentage as number} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Dispatches */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Despachos Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.recentDispatches?.map((dispatch, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{dispatch.dispatchNumber}</Badge>
                      <div>
                        <p className="font-medium">{dispatch.customer}</p>
                        <p className="text-sm text-gray-600">{dispatch.driver} • {dispatch.truck}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        dispatch.status === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                        dispatch.status === 'EN_RUTA' ? 'bg-blue-100 text-blue-800' :
                        dispatch.status === 'CARGANDO' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {dispatch.status}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">{dispatch.quantity} gal</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Estado de la Flota (15 Camiones)</CardTitle>
              <CardDescription>
                Monitoreo en tiempo real de todos los vehículos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[...Array(15)].map((_, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Camión {index + 1}</span>
                      <Badge className={
                        index < 10 ? 'bg-green-100 text-green-800' :
                        index < 13 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {index < 10 ? 'Activo' : index < 13 ? 'Mantenimiento' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Placa: ABC-{(index + 1).toString().padStart(3, '0')}</p>
                      <p>Capacidad: {(Math.random() * 10000 + 5000).toFixed(0)} gal</p>
                      <p>Combustible: {Math.random() > 0.5 ? 'Diesel B5' : 'Gasolina 95'}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dispatches" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Despachos del Día</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.recentDispatches?.map((dispatch, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {dispatch.dispatchNumber}
                          </Badge>
                          <Badge className={
                            dispatch.status === 'COMPLETADO' ? 'bg-green-100 text-green-800' :
                            dispatch.status === 'EN_RUTA' ? 'bg-blue-100 text-blue-800' :
                            dispatch.status === 'CARGANDO' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {dispatch.status}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{dispatch.quantity} gal</p>
                          <p className="text-sm text-gray-600">{dispatch.fuelType}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Cliente:</p>
                          <p className="font-medium">{dispatch.customer}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Conductor:</p>
                          <p className="font-medium">{dispatch.driver}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Camión:</p>
                          <p className="font-medium">{dispatch.truck}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Hora:</p>
                          <p className="font-medium">{dispatch.time}</p>
                        </div>
                      </div>
                      
                      {dispatch.location && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{dispatch.location}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Nuevo Despacho
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Generar Reporte
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Fuel className="h-4 w-4 mr-2" />
                  Ver Inventario
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Conductores
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Truck className="h-4 w-4 mr-2" />
                  Estado de Flota
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Rendimiento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {((metrics?.completedDeliveries || 0) / Math.max(1, metrics?.totalDispatches || 1) * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Tasa de Completación</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {((metrics?.gallonsDispatched || 0) / Math.max(1, metrics?.totalDispatches || 1)).toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-600">Gal/Despacho Promedio</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {((metrics?.activeTrucks || 0) / 15 * 100).toFixed(0)}%
                    </p>
                    <p className="text-sm text-gray-600">Utilización de Flota</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      S/ {((metrics?.dailyRevenue || 0) / Math.max(1, metrics?.gallonsDispatched || 1)).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">Precio/Galón Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Despachos vs Ayer</span>
                    <Badge className="bg-green-100 text-green-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Galones vs Ayer</span>
                    <Badge className="bg-green-100 text-green-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +8%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Ingresos vs Ayer</span>
                    <Badge className="bg-green-100 text-green-800">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +15%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Eficiencia vs Ayer</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      <Zap className="h-3 w-3 mr-1" />
                      +3%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}