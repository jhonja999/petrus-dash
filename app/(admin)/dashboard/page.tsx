"use client"

import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Users, MapPin, FileText, Fuel, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"

// ✅ Interfaz simple para los datos
interface Assignment {
  id: number
  isCompleted: boolean
  createdAt: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { user, isAdmin, isLoading } = useAuth()

  // ✅ Estados locales en lugar de hooks problemáticos
  const [trucks, setTrucks] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/auth/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  // ✅ Cargar datos directamente con fetch
  useEffect(() => {
    const fetchData = async () => {
      if (!mounted || isLoading || !isAdmin) return

      try {
        setDataLoading(true)

        // Fetch trucks y assignments en paralelo
        const [trucksResponse, assignmentsResponse] = await Promise.all([
          axios.get("/api/trucks").catch(() => ({ data: [] })),
          axios.get("/api/assignments").catch(() => ({ data: { assignments: [] } })),
        ])

        setTrucks(trucksResponse.data || [])
        
        // ✅ FIX: Now always expect consistent format {assignments: [...], pagination: {...}}
        const assignmentsData = assignmentsResponse.data
        if (assignmentsData && assignmentsData.assignments) {
          setAssignments(assignmentsData.assignments)
        } else {
          console.warn('⚠️ AdminDashboard: Unexpected assignments response format:', assignmentsData)
          setAssignments([])
        }
        
        setError(null)
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("Error al cargar datos")
        // Continuar con datos vacíos en lugar de fallar
        setTrucks([])
        setAssignments([])
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [mounted, isLoading, isAdmin])

  // ✅ Loading mejorado
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Acceso denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
          <Button asChild className="mt-4">
            <Link href="/auth/unauthorized">Ver detalles</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ✅ Cálculos seguros con fallbacks - Now assignments is guaranteed to be an array
  const activeTrucks = trucks.filter((truck) => truck.state === "Activo").length
  const totalTrucks = trucks.length || 1 // Evitar división por 0

  const todayAssignments = assignments.filter((assignment) => {
    try {
      const today = new Date().toDateString()
      return new Date(assignment.createdAt).toDateString() === today
    } catch {
      return false
    }
  }).length

  const completedAssignments = assignments.filter((a) => a.isCompleted).length
  const trucksWithRemaining = trucks.filter((t) => Number(t.lastRemaining) > 0).length

  return (
   
      <div className="space-y-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State para datos */}
        {dataLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Camiones Activos</CardTitle>
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeTrucks}</div>
                  <p className="text-xs text-muted-foreground">
                    {activeTrucks} de {totalTrucks} camiones
                  </p>
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    {((activeTrucks / totalTrucks) * 100).toFixed(0)}%
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Asignaciones Hoy</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{todayAssignments}</div>
                  <p className="text-xs text-muted-foreground">Despachos programados</p>
                  <Badge className="mt-2 bg-green-100 text-green-800">Hoy</Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Combustible Remanente</CardTitle>
                  <Fuel className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{trucksWithRemaining}</div>
                  <p className="text-xs text-muted-foreground">{trucksWithRemaining} camiones con remanente</p>
                  {trucksWithRemaining > 0 && (
                    <Badge className="mt-2 bg-orange-100 text-orange-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completados</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{completedAssignments}</div>
                  <p className="text-xs text-muted-foreground">Asignaciones finalizadas</p>
                  <Badge className="mt-2 bg-purple-100 text-purple-800">Total</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                  <CardDescription>Gestión diaria del sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/assignments/new">
                        <MapPin className="h-4 w-4 mr-2" />
                        Nueva Asignación
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/trucks">
                        <Truck className="h-4 w-4 mr-2" />
                        Gestionar Camiones
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/users">
                        <Users className="h-4 w-4 mr-2" />
                        Gestionar Usuarios
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/customers">
                        <Users className="h-4 w-4 mr-2" />
                        Gestionar Clientes
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Estado del Sistema</CardTitle>
                  <CardDescription>Resumen operacional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Camiones en tránsito:</span>
                      <Badge variant="outline" className="text-blue-700">
                        {trucks.filter((t) => t.state === "Transito").length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Camiones en descarga:</span>
                      <Badge variant="outline" className="text-purple-700">
                        {trucks.filter((t) => t.state === "Descarga").length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">En mantenimiento:</span>
                      <Badge variant="outline" className="text-yellow-700">
                        {trucks.filter((t) => t.state === "Mantenimiento").length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Asignados:</span>
                      <Badge variant="outline" className="text-green-700">
                        {trucks.filter((t) => t.state === "Asignado").length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reports Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-6 w-6 text-indigo-600" />
                  Reportes y Análisis
                </CardTitle>
                <CardDescription>Acceso a reportes detallados del sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/reports">
                      <FileText className="h-4 w-4 mr-2" />
                      Reportes Generales
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/assignments">
                      <MapPin className="h-4 w-4 mr-2" />
                      Historial Asignaciones
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/analytics">
                      <FileText className="h-4 w-4 mr-2" />
                      Análisis Avanzado
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
  )
}
