"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Download, Calendar, Fuel, BarChart3, TrendingUp, ArrowLeft, AlertCircle, Users, Truck } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { toast } from "sonner"
import axios from "axios"

interface Assignment {
  id: number
  truckId: number
  driverId: number
  totalLoaded: string | number  // Prisma Decimal can come as string or number
  totalRemaining: string | number  // Prisma Decimal can come as string or number
  fuelType: string
  isCompleted: boolean
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  truck: {
    id: number
    placa: string
    typefuel: string
    capacitygal: string | number  // Prisma Decimal
  }
  driver: {
    id: number
    name: string
    lastname: string
    role: string
  }
  discharges: Array<{
    id: number
    customerId: number
    totalDischarged: string | number  // Prisma Decimal
    status: string
    marcadorInicial: string | number | null  // Prisma Decimal
    marcadorFinal: string | number | null  // Prisma Decimal
    cantidadReal: string | number | null  // Prisma Decimal
    createdAt: string
    customer: {
      id: number
      companyname: string
      ruc: string
    }
  }>
}

interface TruckType {
  id: number
  placa: string
  typefuel: string
  capacitygal: number
}

interface User {
  id: number
  name: string
  lastname: string
  role: string
}

interface ReportData {
  assignments: Assignment[]
  summary: {
    totalFuelLoaded: number
    totalFuelDischarged: number
    totalFuelRemaining: number
    completedAssignments: number
    pendingAssignments: number
    trucksUsed: number
    driversActive: number
    efficiencyPercentage: number
    averageFuelPerAssignment: number
    totalDischarges: number
    completedDischarges: number
    pendingDischarges: number
  }
  breakdown: {
    fuelTypes: Record<string, {
      count: number
      totalLoaded: number
      totalRemaining: number
    }>
  }
  metadata: {
    totalRecords: number
    dateRange: {
      start: string | null
      end: string | null
    }
    filters: {
      truckId: string | null
      driverId: string | null
      fuelType: string | null
    }
    generatedAt: string
  }
}

export default function ReportsPage() {
  const { isAdmin, isLoading } = useAuth()
  const router = useRouter()

  // State for filters
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedTruck, setSelectedTruck] = useState<string>("all")
  const [selectedDriver, setSelectedDriver] = useState<string>("all")
  const [selectedFuelType, setSelectedFuelType] = useState<string>("all")
  const [reportType, setReportType] = useState<"daily" | "range">("daily")

  // Data state
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [trucks, setTrucks] = useState<TruckType[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [mounted, isLoading, isAdmin, router])

  // Fetch trucks and drivers for filter options
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!mounted || !isAdmin) return

      try {
        const [trucksRes, driversRes] = await Promise.all([
          axios.get("/api/trucks"),
          axios.get("/api/users"),
        ])

        // Handle trucks response
        if (Array.isArray(trucksRes.data)) {
          setTrucks(trucksRes.data)
        } else if (trucksRes.data.success && Array.isArray(trucksRes.data.data)) {
          setTrucks(trucksRes.data.data)
        }

        // Handle users response and filter drivers
        let users = []
        if (Array.isArray(driversRes.data)) {
          users = driversRes.data
        } else if (driversRes.data.success && Array.isArray(driversRes.data.data)) {
          users = driversRes.data.data
        }

        const driverUsers = users.filter((user: User) => user.role === "Operador")
        setDrivers(driverUsers)
      } catch (error) {
        console.error("Error fetching initial data:", error)
        toast.error("Error al cargar datos iniciales")
      }
    }

    fetchInitialData()
  }, [mounted, isAdmin])

  const generateReport = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (reportType === "daily" && selectedDate) {
        params.append("date", selectedDate)
      } else if (reportType === "range" && startDate) {
        params.append("startDate", startDate)
        if (endDate) {
          params.append("endDate", endDate)
        }
      }

      if (selectedTruck !== "all") {
        params.append("truckId", selectedTruck)
      }

      if (selectedDriver !== "all") {
        params.append("driverId", selectedDriver)
      }

      if (selectedFuelType !== "all") {
        params.append("fuelType", selectedFuelType)
      }

      console.log("Generating report with params:", params.toString())

      const response = await axios.get(`/api/reports?${params.toString()}`)
      
      if (response.data) {
        setReportData(response.data)
        toast.success("Reporte generado exitosamente", {
          description: `Se encontraron ${response.data.assignments.length} asignaciones.`
        })
      }
    } catch (error: any) {
      console.error("Error generating report:", error)
      const errorMessage = error.response?.data?.error || "Error al generar el reporte."
      setError(errorMessage)
      toast.error("Error al generar reporte", {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [reportType, selectedDate, startDate, endDate, selectedTruck, selectedDriver, selectedFuelType])

  const exportReport = useCallback(() => {
    if (!reportData) return

    try {
      const csvContent = [
        ["Fecha", "Camión", "Conductor", "Combustible", "Cargado", "Descargado", "Remanente", "Estado"],
        ...reportData.assignments.map((assignment) => {
          // Convert Prisma Decimals to numbers
          const totalLoaded = Number(assignment.totalLoaded)
          const totalRemaining = Number(assignment.totalRemaining)
          const discharged = totalLoaded - totalRemaining
          
          return [
            new Date(assignment.createdAt).toLocaleDateString(),
            assignment.truck.placa,
            `${assignment.driver.name} ${assignment.driver.lastname}`,
            assignment.fuelType,
            totalLoaded.toFixed(2),
            discharged.toFixed(2),
            totalRemaining.toFixed(2),
            assignment.isCompleted ? "Completado" : "Pendiente",
          ]
        }),
      ]
        .map((row) => row.join(","))
        .join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `reporte-despachos-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success("Reporte exportado exitosamente")
    } catch (error) {
      toast.error("Error al exportar el reporte")
    }
  }, [reportData])

  const setQuickDateRange = (days: number) => {
    const endDateObj = new Date()
    const startDateObj = new Date()
    startDateObj.setDate(startDateObj.getDate() - days + 1)
    
    setStartDate(startDateObj.toISOString().split('T')[0])
    setEndDate(endDateObj.toISOString().split('T')[0])
    setReportType("range")
  }

  // Auto-generate report on component mount
  useEffect(() => {
    if (mounted && isAdmin) {
      generateReport()
    }
  }, [mounted, isAdmin, generateReport])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a esta página.</p>
          <Button asChild>
            <Link href="/dashboard">Volver al Dashboard</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
          <p className="text-sm text-gray-600">Generar reportes detallados del sistema</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                Filtros de Reporte
              </CardTitle>
              <CardDescription>Configure los parámetros para generar el reporte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Report Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Reporte</label>
                <Select value={reportType} onValueChange={(value: "daily" | "range") => setReportType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Reporte Diario</SelectItem>
                    <SelectItem value="range">Rango de Fechas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              {reportType === "daily" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rango de Fechas</label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      placeholder="Fecha inicio"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      max={new Date().toISOString().split('T')[0]}
                    />
                    <input
                      type="date"
                      placeholder="Fecha fin"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min={startDate}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
                      7 días
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
                      30 días
                    </Button>
                  </div>
                </div>
              )}

              {/* Truck Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Camión</label>
                <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los camiones" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los camiones</SelectItem>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()}>
                        {truck.placa} - {truck.typefuel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Driver Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Conductor</label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los conductores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los conductores</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name} {driver.lastname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fuel Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Combustible</label>
                <Select value={selectedFuelType} onValueChange={setSelectedFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="DIESEL_B5">Diésel B5</SelectItem>
                    <SelectItem value="GASOLINA_90">Gasolina 90</SelectItem>
                    <SelectItem value="GASOLINA_95">Gasolina 95</SelectItem>
                    <SelectItem value="GLP">GLP</SelectItem>
                    <SelectItem value="ELECTRICA">Eléctrica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={generateReport}
                disabled={loading || (reportType === "range" && !startDate)}
                className="w-full"
              >
                {loading ? "Generando..." : "Generar Reporte"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Report Results */}
        <div className="lg:col-span-3 space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {reportData && (
            <>
              {/* Summary Cards Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Combustible Cargado</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {reportData.summary.totalFuelLoaded.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">galones</p>
                      </div>
                      <Fuel className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Combustible Descargado</p>
                        <p className="text-2xl font-bold text-green-600">
                          {reportData.summary.totalFuelDischarged.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">galones</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Asignaciones</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {reportData.summary.completedAssignments}/{reportData.assignments.length}
                        </p>
                        <p className="text-xs text-gray-500">completadas</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Eficiencia</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {reportData.summary.efficiencyPercentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">descarga</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Summary Cards Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Camiones Usados</p>
                        <p className="text-2xl font-bold text-indigo-600">
                          {reportData.summary.trucksUsed}
                        </p>
                        <p className="text-xs text-gray-500">vehículos</p>
                      </div>
                      <Truck className="h-8 w-8 text-indigo-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Conductores Activos</p>
                        <p className="text-2xl font-bold text-teal-600">
                          {reportData.summary.driversActive}
                        </p>
                        <p className="text-xs text-gray-500">operadores</p>
                      </div>
                      <Users className="h-8 w-8 text-teal-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Descargas</p>
                        <p className="text-2xl font-bold text-pink-600">
                          {reportData.summary.totalDischarges}
                        </p>
                        <p className="text-xs text-gray-500">operaciones</p>
                      </div>
                      <FileText className="h-8 w-8 text-pink-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Promedio por Asignación</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {reportData.summary.averageFuelPerAssignment.toFixed(1)}
                        </p>
                        <p className="text-xs text-gray-500">galones</p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-amber-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Table */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      Detalle de Asignaciones ({reportData.assignments.length})
                    </CardTitle>
                    {reportData.assignments.length > 0 && (
                      <Button onClick={exportReport} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {reportData.assignments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p>No se encontraron asignaciones para los filtros seleccionados</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Camión</TableHead>
                            <TableHead>Conductor</TableHead>
                            <TableHead>Combustible</TableHead>
                            <TableHead>Cargado</TableHead>
                            <TableHead>Descargado</TableHead>
                            <TableHead>Remanente</TableHead>
                            <TableHead>Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportData.assignments.map((assignment) => {
                            // Convert Prisma Decimal to number
                            const totalLoaded = Number(assignment.totalLoaded)
                            const totalRemaining = Number(assignment.totalRemaining)
                            const discharged = totalLoaded - totalRemaining
                            
                            return (
                              <TableRow key={assignment.id}>
                                <TableCell className="text-sm">
                                  {new Date(assignment.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {assignment.truck.placa}
                                </TableCell>
                                <TableCell>
                                  {assignment.driver.name} {assignment.driver.lastname}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {assignment.fuelType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-semibold text-blue-600">
                                  {totalLoaded.toFixed(2)}
                                </TableCell>
                                <TableCell className="font-semibold text-green-600">
                                  {discharged.toFixed(2)}
                                </TableCell>
                                <TableCell className="font-semibold text-orange-600">
                                  {totalRemaining.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      assignment.isCompleted
                                        ? "bg-green-100 text-green-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }
                                  >
                                    {assignment.isCompleted ? "Completado" : "Pendiente"}
                                  </Badge>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}