"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  History,
  Truck,
  User,
  MapPin,
  Fuel,
  Route,
  Clock,
  Filter,
  Search,
  Download,
  Eye,
  RefreshCw,
  Navigation,
  AlertTriangle,
  Activity,
} from "lucide-react"
import axios from "axios"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface HistoryRecord {
  id: number
  type: "dispatch" | "assignment" | "discharge" | "location" | "maintenance"
  entityId: number
  entityType: "truck" | "driver" | "customer" | "dispatch"
  action: string
  description: string
  metadata: any
  timestamp: string
  userId: number
  user: {
    name: string
    lastname: string
    email: string
  }
  location?: {
    latitude: number
    longitude: number
    address?: string
  }
}

interface TruckHistory {
  truckId: number
  truck: {
    placa: string
    typefuel: string
    capacitygal: number
    state: string
  }
  totalDispatches: number
  totalGallons: number
  totalKilometers: number
  averageEfficiency: number
  lastMaintenance?: string
  nextMaintenance?: string
  currentLocation?: {
    latitude: number
    longitude: number
    address: string
    timestamp: string
  }
  recentActivity: HistoryRecord[]
}

interface DriverHistory {
  driverId: number
  driver: {
    name: string
    lastname: string
    email: string
    dni: string
  }
  totalDispatches: number
  totalGallons: number
  totalKilometers: number
  averageRating: number
  completionRate: number
  lastActivity?: string
  currentAssignment?: {
    dispatchId: number
    dispatchNumber: string
    status: string
    customer: string
  }
  recentActivity: HistoryRecord[]
}

interface TraceabilityRecord {
  id: number
  dispatchId: number
  dispatchNumber: string
  truckPlaca: string
  driverName: string
  customerName: string
  quantity: number
  fuelType: string
  deliveryAddress: string
  status: string
  scheduledDate: string
  startedAt?: string
  completedAt?: string
  gpsTrail: {
    latitude: number
    longitude: number
    timestamp: string
    speed?: number
    heading?: number
  }[]
  partialDeliveries: {
    id: number
    quantity: number
    location: string
    timestamp: string
    remainingBalance: number
  }[]
}

const HISTORY_TYPE_CONFIG = {
  dispatch: {
    label: "Despacho",
    color: "bg-blue-100 text-blue-800",
    icon: Truck,
  },
  assignment: {
    label: "Asignación",
    color: "bg-green-100 text-green-800",
    icon: User,
  },
  discharge: {
    label: "Descarga",
    color: "bg-orange-100 text-orange-800",
    icon: Fuel,
  },
  location: {
    label: "Ubicación",
    color: "bg-purple-100 text-purple-800",
    icon: MapPin,
  },
  maintenance: {
    label: "Mantenimiento",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
  },
}

export default function HistoryPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([])
  const [truckHistories, setTruckHistories] = useState<TruckHistory[]>([])
  const [driverHistories, setDriverHistories] = useState<DriverHistory[]>([])
  const [traceabilityRecords, setTraceabilityRecords] = useState<TraceabilityRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<TraceabilityRecord | null>(null)

  // Filtros
  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    entityType: "all",
    dateFrom: "",
    dateTo: "",
    truckId: "",
    driverId: "",
  })

  useEffect(() => {
    loadHistoryData()
  }, [])

  const loadHistoryData = async () => {
    try {
      setIsLoading(true)

      // Cargar datos de historial general
      const historyResponse = await axios.get("/api/history/records")
      if (historyResponse.data.success) {
        setHistoryRecords(historyResponse.data.data)
      }

      // Cargar historial de camiones
      const trucksResponse = await axios.get("/api/history/trucks")
      if (trucksResponse.data.success) {
        setTruckHistories(trucksResponse.data.data)
      }

      // Cargar historial de conductores
      const driversResponse = await axios.get("/api/history/drivers")
      if (driversResponse.data.success) {
        setDriverHistories(driversResponse.data.data)
      }

      // Cargar trazabilidad completa
      const traceabilityResponse = await axios.get("/api/history/traceability")
      if (traceabilityResponse.data.success) {
        setTraceabilityRecords(traceabilityResponse.data.data)
      }
    } catch (error) {
      console.error("Error loading history data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del historial",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "all",
      entityType: "all",
      dateFrom: "",
      dateTo: "",
      truckId: "",
      driverId: "",
    })
  }

  const exportHistory = async () => {
    try {
      const response = await axios.post(
        "/api/history/export",
        { filters },
        {
          responseType: "blob",
        },
      )

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `historial_${format(new Date(), "yyyy-MM-dd")}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Historial exportado",
        description: "El archivo Excel ha sido descargado",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo exportar el historial",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Historial y Trazabilidad</h1>
          <p className="text-gray-600 mt-1">Sistema completo de seguimiento y auditoría - Petrus</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={loadHistoryData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={exportHistory} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filtros globales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros de Búsqueda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Búsqueda General</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Placa, conductor, cliente..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Evento</Label>
              <Select value={filters.type} onValueChange={(value) => handleFilterChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {Object.entries(HISTORY_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center space-x-2">
                        <config.icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Desde</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Hasta</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button onClick={clearFilters} variant="outline" size="sm">
              Limpiar Filtros
            </Button>
            <p className="text-sm text-gray-600">{historyRecords.length} registros encontrados</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="trucks">Por Camión</TabsTrigger>
          <TabsTrigger value="drivers">Por Conductor</TabsTrigger>
          <TabsTrigger value="traceability">Trazabilidad</TabsTrigger>
          <TabsTrigger value="realtime">Tiempo Real</TabsTrigger>
        </TabsList>

        {/* Tab: Resumen General */}
        <TabsContent value="overview" className="space-y-6">
          {/* Métricas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <History className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Eventos</p>
                    <p className="text-2xl font-bold text-gray-900">{historyRecords.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Truck className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Camiones Activos</p>
                    <p className="text-2xl font-bold text-gray-900">{truckHistories.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conductores</p>
                    <p className="text-2xl font-bold text-gray-900">{driverHistories.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Route className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rutas Completadas</p>
                    <p className="text-2xl font-bold text-gray-900">{traceabilityRecords.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actividad reciente */}
          <Card>
            <CardHeader>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Últimos eventos registrados en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historyRecords.slice(0, 10).map((record) => {
                  const typeConfig = HISTORY_TYPE_CONFIG[record.type as keyof typeof HISTORY_TYPE_CONFIG]
                  const TypeIcon = typeConfig.icon

                  return (
                    <div key={record.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{record.action}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(record.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">{record.description}</p>
                        <p className="text-xs text-gray-500">
                          Por: {record.user.name} {record.user.lastname}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial por Camión */}
        <TabsContent value="trucks" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {truckHistories.map((truckHistory) => (
              <Card key={truckHistory.truckId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Truck className="h-5 w-5" />
                      <span>{truckHistory.truck.placa}</span>
                    </div>
                    <Badge variant="outline">{truckHistory.truck.state}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {truckHistory.truck.typefuel} - {Number(truckHistory.truck.capacitygal).toLocaleString()} gal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Estadísticas del camión */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{truckHistory.totalDispatches}</p>
                      <p className="text-xs text-gray-600">Despachos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{truckHistory.totalGallons.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Galones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {truckHistory.totalKilometers.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Kilómetros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{truckHistory.averageEfficiency.toFixed(1)}</p>
                      <p className="text-xs text-gray-600">km/gal</p>
                    </div>
                  </div>

                  {/* Ubicación actual */}
                  {truckHistory.currentLocation && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Ubicación Actual</span>
                      </div>
                      <p className="text-xs text-gray-600">{truckHistory.currentLocation.address}</p>
                      <p className="text-xs text-gray-500">
                        Actualizado: {format(new Date(truckHistory.currentLocation.timestamp), "HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}

                  {/* Mantenimiento */}
                  <div className="flex justify-between text-sm">
                    <div>
                      <p className="text-gray-600">Último Mant.:</p>
                      <p className="font-medium">
                        {truckHistory.lastMaintenance
                          ? format(new Date(truckHistory.lastMaintenance), "dd/MM/yyyy", { locale: es })
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Próximo Mant.:</p>
                      <p className="font-medium">
                        {truckHistory.nextMaintenance
                          ? format(new Date(truckHistory.nextMaintenance), "dd/MM/yyyy", { locale: es })
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => router.push(`/admin/history/truck/${truckHistory.truckId}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalle Completo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Historial por Conductor */}
        <TabsContent value="drivers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {driverHistories.map((driverHistory) => (
              <Card key={driverHistory.driverId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>
                      {driverHistory.driver.name} {driverHistory.driver.lastname}
                    </span>
                  </CardTitle>
                  <CardDescription>
                    DNI: {driverHistory.driver.dni} | {driverHistory.driver.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Estadísticas del conductor */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{driverHistory.totalDispatches}</p>
                      <p className="text-xs text-gray-600">Despachos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{driverHistory.totalGallons.toLocaleString()}</p>
                      <p className="text-xs text-gray-600">Galones</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {driverHistory.totalKilometers.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Kilómetros</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{driverHistory.completionRate.toFixed(1)}%</p>
                      <p className="text-xs text-gray-600">Completados</p>
                    </div>
                  </div>

                  {/* Calificación promedio */}
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Calificación Promedio</span>
                      <div className="flex items-center space-x-1">
                        <span className="text-lg font-bold text-yellow-600">
                          {driverHistory.averageRating.toFixed(1)}
                        </span>
                        <span className="text-yellow-500">★</span>
                      </div>
                    </div>
                  </div>

                  {/* Asignación actual */}
                  {driverHistory.currentAssignment && (
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Asignación Actual</span>
                      </div>
                      <p className="text-sm font-medium">{driverHistory.currentAssignment.dispatchNumber}</p>
                      <p className="text-xs text-gray-600">{driverHistory.currentAssignment.customer}</p>
                      <Badge variant="outline" className="mt-1">
                        {driverHistory.currentAssignment.status}
                      </Badge>
                    </div>
                  )}

                  {/* Última actividad */}
                  {driverHistory.lastActivity && (
                    <div className="text-sm">
                      <p className="text-gray-600">Última Actividad:</p>
                      <p className="font-medium">
                        {format(new Date(driverHistory.lastActivity), "dd/MM/yyyy HH:mm", { locale: es })}
                      </p>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent"
                    onClick={() => router.push(`/admin/history/driver/${driverHistory.driverId}`)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Historial Completo
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Trazabilidad Completa */}
        <TabsContent value="traceability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trazabilidad Completa de Despachos</CardTitle>
              <CardDescription>Seguimiento detallado: quién entregó cuánto, cuándo y dónde</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No. Vale</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Combustible</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Entregas Parciales</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {traceabilityRecords.map((record) => (
                      <TableRow key={record.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono">{record.dispatchNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{record.truckPlaca}</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.driverName}</TableCell>
                        <TableCell>{record.customerName}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Fuel className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{record.quantity.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">gal</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.fuelType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{record.partialDeliveries.length}</span>
                            <span className="text-xs text-gray-500">entregas</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 max-w-[200px]">
                            <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs text-gray-600 truncate" title={record.deliveryAddress}>
                              {record.deliveryAddress}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(record)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Trazabilidad Completa - {record.dispatchNumber}</DialogTitle>
                                <DialogDescription>
                                  Seguimiento detallado del despacho con GPS y entregas parciales
                                </DialogDescription>
                              </DialogHeader>
                              {selectedRecord && <TraceabilityDetailView record={selectedRecord} />}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Seguimiento en Tiempo Real */}
        <TabsContent value="realtime" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mapa en tiempo real */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Navigation className="h-5 w-5" />
                  <span>Seguimiento GPS en Tiempo Real</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 h-96 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Mapa de seguimiento en tiempo real</p>
                    <p className="text-sm text-gray-500">Integración con GPS de camiones activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Camiones activos */}
            <Card>
              <CardHeader>
                <CardTitle>Camiones en Ruta</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {truckHistories.slice(0, 5).map((truck) => (
                    <div key={truck.truckId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <div>
                          <p className="font-medium">{truck.truck.placa}</p>
                          <p className="text-xs text-gray-500">
                            {truck.currentLocation?.address || "Ubicación no disponible"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">En Ruta</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Alertas en tiempo real */}
            <Card>
              <CardHeader>
                <CardTitle>Alertas Activas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Mantenimiento Programado</p>
                      <p className="text-xs text-yellow-600">Camión ABC-123 - Mañana</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">Combustible Bajo</p>
                      <p className="text-xs text-red-600">Camión XYZ-789 - 15% restante</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Retraso en Entrega</p>
                      <p className="text-xs text-blue-600">Despacho PE-000123 - 30 min</p>
                    </div>
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

// Componente para mostrar el detalle de trazabilidad
function TraceabilityDetailView({ record }: { record: TraceabilityRecord }) {
  return (
    <div className="space-y-6">
      {/* Información general */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h4 className="font-semibold">Información del Despacho</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">No. Vale:</span>
              <span className="font-medium">{record.dispatchNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Placa:</span>
              <span className="font-medium">{record.truckPlaca}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conductor:</span>
              <span className="font-medium">{record.driverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cliente:</span>
              <span className="font-medium">{record.customerName}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-semibold">Detalles de Entrega</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Cantidad Total:</span>
              <span className="font-medium">{record.quantity.toLocaleString()} gal</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Combustible:</span>
              <span className="font-medium">{record.fuelType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado:</span>
              <Badge variant="outline">{record.status}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Programado:</span>
              <span className="font-medium">
                {format(new Date(record.scheduledDate), "dd/MM/yyyy HH:mm", { locale: es })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Entregas parciales */}
      {record.partialDeliveries.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3">Entregas Parciales y Reasignación de Saldos</h4>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Entrega</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Cantidad</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Ubicación</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Fecha/Hora</th>
                  <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Saldo Restante</th>
                </tr>
              </thead>
              <tbody>
                {record.partialDeliveries.map((delivery, index) => (
                  <tr key={delivery.id}>
                    <td className="border border-gray-300 px-3 py-2 text-sm">#{index + 1}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                      {delivery.quantity.toLocaleString()} gal
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{delivery.location}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">
                      {format(new Date(delivery.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                    </td>
                    <td className="border border-gray-300 px-3 py-2 text-sm font-medium">
                      {delivery.remainingBalance.toLocaleString()} gal
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rastro GPS */}
      <div>
        <h4 className="font-semibold mb-3">Rastro GPS</h4>
        <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Mapa de rastro GPS</p>
            <p className="text-sm text-gray-500">{record.gpsTrail.length} puntos registrados</p>
          </div>
        </div>

        {/* Lista de puntos GPS */}
        <div className="mt-4 max-h-32 overflow-y-auto">
          <div className="space-y-1">
            {record.gpsTrail.slice(0, 5).map((point, index) => (
              <div key={index} className="flex justify-between text-xs text-gray-600 p-2 bg-gray-50 rounded">
                <span>
                  {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
                </span>
                <span>{format(new Date(point.timestamp), "HH:mm:ss", { locale: es })}</span>
                {point.speed && <span>{point.speed.toFixed(1)} km/h</span>}
              </div>
            ))}
            {record.gpsTrail.length > 5 && (
              <p className="text-xs text-gray-500 text-center py-2">... y {record.gpsTrail.length - 5} puntos más</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
