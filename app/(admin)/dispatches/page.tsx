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
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Truck,
  User,
  MapPin,
  Calendar,
  Fuel,
  BarChart3,
  FileText,
  Mail,
  Printer,
  AlertTriangle,
  CheckCircle,
  Clock,
  Route,
  RefreshCw,
} from "lucide-react"
import axios from "axios"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Dispatch {
  id: number
  dispatchNumber: string
  year: number
  truckId: number
  driverId: number
  customerId: number
  fuelType: string
  customFuelName?: string
  quantity: number
  deliveryLatitude?: number
  deliveryLongitude?: number
  deliveryAddress: string
  locationMethod: string
  status: string
  priority: string
  scheduledDate: string
  startedAt?: string
  enRouteAt?: string
  completedAt?: string
  notes?: string
  truck: {
    id: number
    placa: string
    typefuel: string
    capacitygal: number
    currentLoad: number
    state: string
  }
  driver: {
    id: number
    name: string
    lastname: string
    email: string
    dni: string
  }
  customer: {
    id: number
    companyname: string
    ruc: string
    address: string
  }
  createdAt: string
  updatedAt: string
}

interface DashboardStats {
  totalDispatches: number
  activeDispatches: number
  completedToday: number
  totalGallons: number
  totalRevenue: number
  pendingDispatches: number
}

const STATUS_CONFIG = {
  PROGRAMADO: {
    label: "Programado",
    color: "bg-blue-100 text-blue-800",
    icon: Clock,
    description: "Esperando iniciar",
  },
  CARGANDO: {
    label: "Cargando",
    color: "bg-yellow-100 text-yellow-800",
    icon: Truck,
    description: "En proceso de carga",
  },
  EN_RUTA: {
    label: "En Ruta",
    color: "bg-orange-100 text-orange-800",
    icon: Route,
    description: "Camino al destino",
  },
  COMPLETADO: {
    label: "Completado",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    description: "Entrega finalizada",
  },
  CANCELADO: {
    label: "Cancelado",
    color: "bg-red-100 text-red-800",
    icon: AlertTriangle,
    description: "Despacho cancelado",
  },
  BORRADOR: {
    label: "Borrador",
    color: "bg-gray-100 text-gray-800",
    icon: FileText,
    description: "Pendiente de envío",
  },
}

const PRIORITY_CONFIG = {
  NORMAL: { label: "Normal", color: "bg-gray-100 text-gray-800" },
  ALTA: { label: "Alta", color: "bg-yellow-100 text-yellow-800" },
  URGENTE: { label: "Urgente", color: "bg-red-100 text-red-800" },
}

const FUEL_TYPE_LABELS = {
  DIESEL_B5: "Diesel B5",
  DIESEL_B500: "Diesel B500",
  GASOLINA_PREMIUM_95: "Gasolina Premium 95",
  GASOLINA_REGULAR_90: "Gasolina Regular 90",
  GASOHOL_84: "Gasohol 84",
  GASOHOL_90: "Gasohol 90",
  GASOHOL_95: "Gasohol 95",
  SOLVENTE: "Solvente Industrial",
  GASOL: "Gasol",
  PERSONALIZADO: "Personalizado",
}

export default function DispatchesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [filteredDispatches, setFilteredDispatches] = useState<Dispatch[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalDispatches: 0,
    activeDispatches: 0,
    completedToday: 0,
    totalGallons: 0,
    totalRevenue: 0,
    pendingDispatches: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDispatch, setSelectedDispatch] = useState<Dispatch | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  // Filtros
  const [filters, setFilters] = useState({
    search: "",
    status: "PROGRAMADO",
    driver: "",
    customer: "",
    fuelType: "",
    dateFrom: "",
    dateTo: "",
    priority: "NORMAL",
  })

  // Cargar datos iniciales
  useEffect(() => {
    loadDispatches()
  }, [])

  // Aplicar filtros
  useEffect(() => {
    applyFilters()
  }, [dispatches, filters])

  const loadDispatches = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get("/api/dispatches?limit=100")

      if (response.data.success) {
        setDispatches(response.data.data)
        calculateDashboardStats(response.data.data)
      }
    } catch (error) {
      console.error("Error loading dispatches:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los despachos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateDashboardStats = (dispatchList: Dispatch[]) => {
    const today = new Date().toISOString().split("T")[0]

    const stats: DashboardStats = {
      totalDispatches: dispatchList.length,
      activeDispatches: dispatchList.filter((d) => d.status === "CARGANDO" || d.status === "EN_RUTA").length,
      completedToday: dispatchList.filter((d) => d.status === "COMPLETADO" && d.completedAt?.split("T")[0] === today)
        .length,
      totalGallons: dispatchList.reduce((sum, d) => sum + Number(d.quantity), 0),
      totalRevenue: dispatchList
        .filter((d) => d.status === "COMPLETADO")
        .reduce((sum, d) => sum + Number(d.quantity) * 12.5, 0), // Precio base
      pendingDispatches: dispatchList.filter((d) => d.status === "PROGRAMADO" || d.status === "BORRADOR").length,
    }

    setDashboardStats(stats)
  }

  const applyFilters = () => {
    let filtered = [...dispatches]

    // Búsqueda general
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(
        (d) =>
          d.dispatchNumber.toLowerCase().includes(searchTerm) ||
          d.truck.placa.toLowerCase().includes(searchTerm) ||
          d.driver.name.toLowerCase().includes(searchTerm) ||
          d.driver.lastname.toLowerCase().includes(searchTerm) ||
          d.customer.companyname.toLowerCase().includes(searchTerm) ||
          d.customer.ruc.includes(searchTerm),
      )
    }

    // Filtros específicos
    if (filters.status) {
      filtered = filtered.filter((d) => d.status === filters.status)
    }
    if (filters.fuelType) {
      filtered = filtered.filter((d) => d.fuelType === filters.fuelType)
    }
    if (filters.priority) {
      filtered = filtered.filter((d) => d.priority === filters.priority)
    }
    if (filters.dateFrom) {
      filtered = filtered.filter((d) => new Date(d.scheduledDate) >= new Date(filters.dateFrom))
    }
    if (filters.dateTo) {
      filtered = filtered.filter((d) => new Date(d.scheduledDate) <= new Date(filters.dateTo))
    }

    setFilteredDispatches(filtered)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "PROGRAMADO",
      driver: "",
      customer: "",
      fuelType: "",
      dateFrom: "",
      dateTo: "",
      priority: "NORMAL",
    })
  }

  const handleExportPDF = async (dispatch: Dispatch) => {
    try {
      const response = await axios.post(
        "/api/reports/pdf",
        {
          dispatchId: dispatch.id,
          type: "dispatch_report",
        },
        {
          responseType: "blob",
        },
      )

      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Despacho_${dispatch.dispatchNumber}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "PDF generado",
        description: `Reporte del despacho ${dispatch.dispatchNumber} descargado`,
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      })
    }
  }

  const handleDeleteDispatch = async (dispatchId: number) => {
    if (!confirm("¿Está seguro de eliminar este despacho?")) return

    try {
      await axios.delete(`/api/dispatches/${dispatchId}`)
      toast({
        title: "Despacho eliminado",
        description: "El despacho ha sido eliminado exitosamente",
      })
      loadDispatches()
    } catch (error) {
      console.error("Error deleting dispatch:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el despacho",
        variant: "destructive",
      })
    }
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PROGRAMADO
  }

  const getPriorityConfig = (priority: string) => {
    return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.NORMAL
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
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Despachos</h1>
          <p className="text-gray-600 mt-1">Sistema integral de despachos de combustible - Petrus</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={loadDispatches} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => router.push("/admin/dispatches/new")} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Despacho
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Despachos</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalDispatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Truck className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En Proceso</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeDispatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completados Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.completedToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Fuel className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Galones</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalGallons.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos</p>
                <p className="text-2xl font-bold text-gray-900">S/ {dashboardStats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardStats.pendingDispatches}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros y Búsqueda</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Búsqueda General</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="No. Vale, placa, conductor, cliente..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROGRAMADO">Todos los estados</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
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
              <Label>Tipo de Combustible</Label>
              <Select value={filters.fuelType} onValueChange={(value) => handleFilterChange("fuelType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  {Object.entries(FUEL_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={filters.priority} onValueChange={(value) => handleFilterChange("priority", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">Todas las prioridades</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <Badge className={config.color}>{config.label}</Badge>
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

            <div className="flex items-end space-x-2">
              <Button onClick={clearFilters} variant="outline" className="w-full bg-transparent">
                Limpiar Filtros
              </Button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Mostrando {filteredDispatches.length} de {dispatches.length} despachos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Despachos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Despachos</CardTitle>
          <CardDescription>Gestión completa de despachos de combustible con seguimiento en tiempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">No. Vale</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Combustible</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDispatches.map((dispatch) => {
                  const statusConfig = getStatusConfig(dispatch.status)
                  const priorityConfig = getPriorityConfig(dispatch.priority)
                  const StatusIcon = statusConfig.icon

                  return (
                    <TableRow key={dispatch.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono font-medium">{dispatch.dispatchNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{dispatch.truck.placa}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{dispatch.customer.companyname}</div>
                          <div className="text-xs text-gray-500">RUC: {dispatch.customer.ruc}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {dispatch.driver.name} {dispatch.driver.lastname}
                          </div>
                          <div className="text-xs text-gray-500">{dispatch.driver.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {dispatch.fuelType === "PERSONALIZADO"
                              ? dispatch.customFuelName
                              : FUEL_TYPE_LABELS[dispatch.fuelType as keyof typeof FUEL_TYPE_LABELS]}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Fuel className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">{Number(dispatch.quantity).toLocaleString()}</span>
                          <span className="text-xs text-gray-500">gal</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {format(new Date(dispatch.scheduledDate), "dd/MM/yyyy", { locale: es })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(dispatch.scheduledDate), "HH:mm", { locale: es })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 max-w-[200px]">
                          <MapPin className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-xs text-gray-600 truncate" title={dispatch.deliveryAddress}>
                            {dispatch.deliveryAddress}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedDispatch(dispatch)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Detalle del Despacho {dispatch.dispatchNumber}</DialogTitle>
                                <DialogDescription>Información completa del despacho de combustible</DialogDescription>
                              </DialogHeader>
                              {selectedDispatch && <DispatchDetailView dispatch={selectedDispatch} />}
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/admin/dispatches/${dispatch.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button variant="outline" size="sm" onClick={() => handleExportPDF(dispatch)}>
                            <Download className="h-4 w-4" />
                          </Button>

                          {(dispatch.status === "BORRADOR" || dispatch.status === "PROGRAMADO") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDispatch(dispatch.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {filteredDispatches.length === 0 && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay despachos</h3>
                <p className="text-gray-500">
                  {filters.search || filters.status || filters.fuelType
                    ? "No se encontraron despachos con los filtros aplicados"
                    : "Aún no se han creado despachos"}
                </p>
                {!filters.search && !filters.status && !filters.fuelType && (
                  <Button className="mt-4" onClick={() => router.push("/admin/dispatches/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Despacho
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para mostrar el detalle del despacho
function DispatchDetailView({ dispatch }: { dispatch: Dispatch }) {
  const statusConfig = STATUS_CONFIG[dispatch.status as keyof typeof STATUS_CONFIG]
  const priorityConfig = PRIORITY_CONFIG[dispatch.priority as keyof typeof PRIORITY_CONFIG]
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* Header del despacho */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h3 className="text-lg font-semibold">{dispatch.dispatchNumber}</h3>
          <p className="text-sm text-gray-600">
            Creado el {format(new Date(dispatch.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={priorityConfig.color}>{priorityConfig.label}</Badge>
          <Badge className={statusConfig.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="timeline">Cronología</TabsTrigger>
          <TabsTrigger value="location">Ubicación</TabsTrigger>
          <TabsTrigger value="actions">Acciones</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información del Vehículo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Truck className="h-5 w-5" />
                  <span>Vehículo y Conductor</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Placa:</span>
                  <span className="font-medium">{dispatch.truck.placa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Capacidad:</span>
                  <span className="font-medium">{Number(dispatch.truck.capacitygal).toLocaleString()} gal</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Conductor:</span>
                  <span className="font-medium">
                    {dispatch.driver.name} {dispatch.driver.lastname}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{dispatch.driver.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">DNI:</span>
                  <span className="font-medium">{dispatch.driver.dni}</span>
                </div>
              </CardContent>
            </Card>

            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Cliente</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Empresa:</span>
                  <span className="font-medium">{dispatch.customer.companyname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">RUC:</span>
                  <span className="font-medium">{dispatch.customer.ruc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dirección:</span>
                  <span className="font-medium text-right text-sm">{dispatch.customer.address}</span>
                </div>
              </CardContent>
            </Card>

            {/* Información del Combustible */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Fuel className="h-5 w-5" />
                  <span>Combustible</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium">
                    {dispatch.fuelType === "PERSONALIZADO"
                      ? dispatch.customFuelName
                      : FUEL_TYPE_LABELS[dispatch.fuelType as keyof typeof FUEL_TYPE_LABELS]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cantidad:</span>
                  <span className="font-medium text-lg">{Number(dispatch.quantity).toLocaleString()} galones</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Estimado:</span>
                  <span className="font-medium">S/ {(Number(dispatch.quantity) * 12.5).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Programación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Programación</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha Programada:</span>
                  <span className="font-medium">
                    {format(new Date(dispatch.scheduledDate), "dd/MM/yyyy HH:mm", { locale: es })}
                  </span>
                </div>
                {dispatch.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Iniciado:</span>
                    <span className="font-medium text-green-600">
                      {format(new Date(dispatch.startedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
                {dispatch.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completado:</span>
                    <span className="font-medium text-blue-600">
                      {format(new Date(dispatch.completedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Observaciones */}
          {dispatch.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{dispatch.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cronología del Despacho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">Despacho Programado</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(dispatch.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>
                  </div>
                </div>

                {dispatch.startedAt && (
                  <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <Truck className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <div className="font-medium">Carga Iniciada</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(dispatch.startedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                  </div>
                )}

                {dispatch.enRouteAt && (
                  <div className="flex items-center space-x-4 p-3 bg-orange-50 rounded-lg">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Route className="h-4 w-4 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium">En Ruta</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(dispatch.enRouteAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                  </div>
                )}

                {dispatch.completedAt && (
                  <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">Despacho Completado</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(dispatch.completedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5" />
                <span>Información de Ubicación</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Dirección de Entrega</Label>
                <p className="text-gray-700">{dispatch.deliveryAddress}</p>
              </div>

              {dispatch.deliveryLatitude && dispatch.deliveryLongitude && (
                <div className="space-y-2">
                  <Label>Coordenadas GPS</Label>
                  <p className="font-mono text-sm">
                    {dispatch.deliveryLatitude}, {dispatch.deliveryLongitude}
                  </p>
                  <a
                    href={`https://www.google.com/maps?q=${dispatch.deliveryLatitude},${dispatch.deliveryLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Ver en Google Maps
                  </a>
                </div>
              )}

              <div className="space-y-2">
                <Label>Método de Ubicación</Label>
                <Badge variant="outline">
                  {dispatch.locationMethod === "GPS_AUTO"
                    ? "GPS Automático"
                    : dispatch.locationMethod === "GPS_MANUAL"
                      ? "GPS Manual"
                      : "Planificado en Oficina"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acciones Disponibles</CardTitle>
              <CardDescription>Opciones de gestión para este despacho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="w-full justify-start" size="lg">
                  <Download className="h-4 w-4 mr-2" />
                  Generar Reporte PDF
                </Button>

                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar por Email
                </Button>

                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Vale
                </Button>

                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Despacho
                </Button>

                {dispatch.deliveryLatitude && dispatch.deliveryLongitude && (
                  <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                    <MapPin className="h-4 w-4 mr-2" />
                    Rastrear Ubicación
                  </Button>
                )}

                <Button variant="outline" className="w-full justify-start bg-transparent" size="lg">
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
