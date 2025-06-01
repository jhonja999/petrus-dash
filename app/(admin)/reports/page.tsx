"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DatePicker } from "@/components/ui/date-picker"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Download, Calendar, Fuel, BarChart3, TrendingUp, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import type { DateRange } from "react-day-picker"
import { formatDate, getDateRange } from "@/lib/date"
import axios from "axios"
import type { Assignment, Truck as TruckType, User } from "@/types/globals"

interface ReportData {
  assignments: Assignment[]
  totalFuelLoaded: number
  totalFuelDischarged: number
  totalFuelRemaining: number
  completedAssignments: number
  pendingAssignments: number
  trucksUsed: number
  driversActive: number
  efficiencyPercentage: number
}

// Safe auth hook that handles SSR
function useSafeAuth() {
  const [authState, setAuthState] = useState<{
    isAdmin: boolean;
    isLoading: boolean;
    isReady: boolean;
  }>({
    isAdmin: false,
    isLoading: true,
    isReady: false
  })

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const { useAuth } = await import("@/hooks/useAuth")
        const auth = useAuth()
        setAuthState({
          isAdmin: auth.isAdmin,
          isLoading: auth.isLoading,
          isReady: true
        })
      } catch (error) {
        console.error("Auth context not available:", error)
        setAuthState({
          isAdmin: false,
          isLoading: false,
          isReady: true
        })
      }
    }

    loadAuth()
  }, [])

  return authState
}

export default function ReportsPage() {
  const { isAdmin, isLoading, isReady } = useSafeAuth()
  const router = useRouter()

  // State for filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedTruck, setSelectedTruck] = useState<string>("")
  const [selectedDriver, setSelectedDriver] = useState<string>("")
  const [selectedFuelType, setSelectedFuelType] = useState<string>("")
  const [reportType, setReportType] = useState<"daily" | "range">("daily")

  // Data state
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [trucks, setTrucks] = useState<TruckType[]>([])
  const [drivers, setDrivers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isReady && !isLoading && !isAdmin) {
      router.push("/auth/unauthorized")
    }
  }, [isAdmin, isLoading, isReady, router])

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [trucksRes, driversRes] = await Promise.all([
          axios.get("/api/trucks"),
          axios.get("/api/users?role=conductor"),
        ])
        setTrucks(trucksRes.data)
        setDrivers(driversRes.data)
      } catch (error) {
        console.error("Error fetching initial data:", error)
        setError("Error al cargar datos iniciales")
      }
    }

    if (isReady && isAdmin) {
      fetchInitialData()
    }
  }, [isAdmin, isReady])

  const generateReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()

      if (reportType === "daily" && selectedDate) {
        params.append("date", selectedDate.toISOString().split("T")[0])
      } else if (reportType === "range" && dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString().split("T")[0])
        if (dateRange.to) {
          params.append("endDate", dateRange.to.toISOString().split("T")[0])
        }
      }

      if (selectedTruck) params.append("truckId", selectedTruck)
      if (selectedDriver) params.append("driverId", selectedDriver)
      if (selectedFuelType) params.append("fuelType", selectedFuelType)

      const response = await axios.get(`/api/reports?${params.toString()}`)
      setReportData(response.data)
    } catch (error) {
      console.error("Error generating report:", error)
      setError("Error al generar el reporte. Intente nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  const exportReport = () => {
    if (!reportData) return

    const csvContent = [
      ["Fecha", "Camión", "Conductor", "Combustible", "Cargado", "Descargado", "Remanente", "Estado"],
      ...reportData.assignments.map((assignment) => [
        formatDate(assignment.createdAt),
        assignment.truck.placa,
        `${assignment.driver.name} ${assignment.driver.lastname}`,
        assignment.fuelType,
        assignment.totalLoaded.toString(),
        (Number(assignment.totalLoaded) - Number(assignment.totalRemaining)).toString(),
        assignment.totalRemaining.toString(),
        assignment.isCompleted ? "Completado" : "Pendiente",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `reporte-despachos-${formatDate(new Date()).replace(/\//g, "-")}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const setQuickDateRange = (days: number) => {
    const range = getDateRange(days)
    setDateRange({ from: range.start, to: range.end })
    setReportType("range")
  }

  // Show loading until auth is ready
  if (!isReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  // Redirect if not admin (handled by useEffect but this is a fallback)
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">No tienes permisos para acceder a esta página.</p>
          <Button asChild>
            <Link href="/auth/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Link>
              </Button>
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-blue-600" />
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Reportes y Análisis</h1>
                  <p className="text-sm text-gray-600">Generar reportes detallados del sistema</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                    <DatePicker
                      date={selectedDate}
                      onDateChange={(date) => date && setSelectedDate(date)}
                      placeholder="Seleccionar fecha"
                      toDate={new Date()}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rango de Fechas</label>
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                      placeholder="Seleccionar rango"
                    />
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
                  disabled={
                    loading || (reportType === "daily" && !selectedDate) || (reportType === "range" && !dateRange?.from)
                  }
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
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Combustible Cargado</p>
                          <p className="text-2xl font-bold text-blue-600">{reportData.totalFuelLoaded.toFixed(2)}</p>
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
                            {reportData.totalFuelDischarged.toFixed(2)}
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
                            {reportData.completedAssignments}/{reportData.assignments.length}
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
                            {reportData.efficiencyPercentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">descarga</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-orange-600" />
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
                              const discharged = Number(assignment.totalLoaded) - Number(assignment.totalRemaining)
                              return (
                                <TableRow key={assignment.id}>
                                  <TableCell>{formatDate(assignment.createdAt)}</TableCell>
                                  <TableCell className="font-medium">{assignment.truck.placa}</TableCell>
                                  <TableCell>
                                    {assignment.driver.name} {assignment.driver.lastname}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{assignment.fuelType}</Badge>
                                  </TableCell>
                                  <TableCell className="font-semibold text-blue-600">
                                    {assignment.totalLoaded.toString()}
                                  </TableCell>
                                  <TableCell className="font-semibold text-green-600">
                                    {discharged.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="font-semibold text-orange-600">
                                    {assignment.totalRemaining.toString()}
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
      </main>
    </div>
  )
}