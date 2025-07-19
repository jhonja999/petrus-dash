"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Plus,
  Search,
  Filter,
  MapPin,
  Truck,
  User,
  Calendar,
  Fuel,
  DollarSign,
  Eye,
  Edit,
  Download,
  RefreshCw,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { DispatchForm } from "@/components/DispatchForm"
import { PetrusDashboard } from "@/components/PetrusDashboard"
import { toast } from "sonner"
import axios from "axios"

interface Dispatch {
  id: string
  dispatchNumber: string
  status: string
  totalQuantity: number
  remainingQuantity: number
  fuelType: string
  customFuelType?: string
  scheduledDate: string
  pricePerGallon?: number
  total?: number
  truck: {
    placa: string
    typefuel: string
  }
  driver: {
    name: string
    lastname: string
    email: string
  }
  customer: {
    companyname: string
    ruc: string
  }
  deliveries: any[]
  photos: any[]
}

export default function DispatchesPage() {
  const { isAdmin, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [dispatches, setDispatches] = useState<Dispatch[]>([])
  const [trucks, setTrucks] = useState([])
  const [drivers, setDrivers] = useState([])
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [driverFilter, setDriverFilter] = useState("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [mounted, isLoading, isAdmin, router])

  useEffect(() => {
    if (mounted && isAdmin) {
      fetchData()
    }
  }, [mounted, isAdmin, statusFilter, dateFilter, driverFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch dispatches with filters
      const params = new URLSearchParams()
      if (statusFilter !== "all") params.append("status", statusFilter)
      if (dateFilter) params.append("date", dateFilter)
      if (driverFilter !== "all") params.append("driverId", driverFilter)

      const [dispatchesRes, trucksRes, driversRes, customersRes] = await Promise.all([
        axios.get(`/api/dispatches?${params.toString()}`),
        axios.get("/api/trucks"),
        axios.get("/api/users?role=Operador"),
        axios.get("/api/customers")
      ])

      setDispatches(dispatchesRes.data.dispatches || [])
      setTrucks(trucksRes.data || [])
      setDrivers(driversRes.data || [])
      setCustomers(customersRes.data || [])

      toast.success("Datos cargados", {
        description: `${dispatchesRes.data.dispatches?.length || 0} despachos encontrados`
      })

    } catch (err) {
      console.error("Error fetching data:", err)
      setError("Error al cargar los datos")
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    fetchData()
    toast.info("Actualizando datos...")
  }

  const filteredDispatches = dispatches.filter(dispatch => {
    const matchesSearch = 
      dispatch.dispatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatch.customer.companyname.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dispatch.truck.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${dispatch.driver.name} ${dispatch.driver.lastname}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROGRAMADO': return 'bg-gray-100 text-gray-800'
      case 'CARGANDO': return 'bg-yellow-100 text-yellow-800'
      case 'EN_RUTA': return 'bg-blue-100 text-blue-800'
      case 'COMPLETADO': return 'bg-green-100 text-green-800'
      case 'CANCELADO': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PROGRAMADO': return <Calendar className="h-3 w-3" />
      case 'CARGANDO': return <Fuel className="h-3 w-3" />
      case 'EN_RUTA': return <Truck className="h-3 w-3" />
      case 'COMPLETADO': return <FileText className="h-3 w-3" />
      case 'CANCELADO': return <AlertCircle className="h-3 w-3" />
      default: return <FileText className="h-3 w-3" />
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
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Despachos Petrus</h1>
          <p className="text-gray-600">Gestión completa de despachos de combustible</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Volver</Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="dispatches">Gestión de Despachos</TabsTrigger>
          <TabsTrigger value="new">Nuevo Despacho</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PetrusDashboard />
        </TabsContent>

        <TabsContent value="dispatches" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Número, cliente, camión..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="PROGRAMADO">Programado</SelectItem>
                      <SelectItem value="CARGANDO">Cargando</SelectItem>
                      <SelectItem value="EN_RUTA">En Ruta</SelectItem>
                      <SelectItem value="COMPLETADO">Completado</SelectItem>
                      <SelectItem value="CANCELADO">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha</label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Conductor</label>
                  <Select value={driverFilter} onValueChange={setDriverFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los conductores</SelectItem>
                      {drivers.map((driver: any) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name} {driver.lastname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Acciones</label>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setDateFilter(new Date().toISOString().split('T')[0])
                      setDriverFilter("all")
                    }}
                    className="w-full"
                  >
                    Limpiar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispatches List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Despachos ({filteredDispatches.length})
                </span>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Cargando despachos...</p>
                </div>
              ) : filteredDispatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No se encontraron despachos con los filtros aplicados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDispatches.map((dispatch) => (
                    <div key={dispatch.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                            {dispatch.dispatchNumber}
                          </Badge>
                          <Badge className={getStatusColor(dispatch.status)}>
                            {getStatusIcon(dispatch.status)}
                            <span className="ml-1">{dispatch.status}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Cliente:
                          </p>
                          <p className="font-medium">{dispatch.customer.companyname}</p>
                          <p className="text-xs text-gray-500">RUC: {dispatch.customer.ruc}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            Vehículo:
                          </p>
                          <p className="font-medium">{dispatch.truck.placa}</p>
                          <p className="text-xs text-gray-500">{dispatch.driver.name} {dispatch.driver.lastname}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Fuel className="h-3 w-3" />
                            Combustible:
                          </p>
                          <p className="font-medium">
                            {dispatch.customFuelType || dispatch.fuelType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Number(dispatch.totalQuantity).toLocaleString()} gal
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Programado:
                          </p>
                          <p className="font-medium">
                            {new Date(dispatch.scheduledDate).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(dispatch.scheduledDate).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Financial info */}
                      {dispatch.total && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Total facturado:</span>
                            <span className="font-bold text-green-600 flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              S/ {Number(dispatch.total).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Progress indicators */}
                      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {dispatch.deliveries.length} entrega(s)
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {dispatch.photos.length} foto(s)
                        </span>
                        {dispatch.remainingQuantity > 0 && (
                          <span className="text-orange-600">
                            {Number(dispatch.remainingQuantity).toFixed(2)} gal restante
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new">
          <DispatchForm
            trucks={trucks}
            drivers={drivers}
            customers={customers}
            onSuccess={() => {
              fetchData()
              toast.success("Despacho creado exitosamente")
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}