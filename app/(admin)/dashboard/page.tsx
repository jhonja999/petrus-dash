"use client"

import { DashboardCard } from "@/components/DashboardCard"
import { useTruckState } from "@/hooks/useTruckState"
import { useAssignments } from "@/hooks/useAssignments"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Truck, Users, MapPin, FileText, Calendar, Fuel, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { formatDate } from "@/lib/date"
import dynamic from "next/dynamic"

function AdminDashboardContent() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Now it's safe to use hooks since we're on the client and mounted
  const { user, isAdmin, isLoading } = useAuth()
  const { trucks } = useTruckState()
  const { assignments } = useAssignments()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/auth/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  // Show loading state until mounted and auth is resolved
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
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Acceso denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  const activeTrucks = trucks.filter((truck) => truck.state === "Activo").length
  const todayAssignments = assignments.filter((assignment) => {
    const today = new Date().toDateString()
    return new Date(assignment.createdAt).toDateString() === today
  }).length

  const completedAssignments = assignments.filter((a) => a.isCompleted).length
  const trucksWithRemaining = trucks.filter((t) => Number(t.lastRemaining) > 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
                <p className="text-sm text-gray-600">{formatDate(new Date())}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-700 border-green-300">
                <Calendar className="h-3 w-3 mr-1" />
                Admin
              </Badge>
              <span className="text-sm text-gray-600">Bienvenido, {user?.name}</span>
              <Button asChild variant="outline">
                <a href="/api/auth/logout">Cerrar Sesión</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            title="Camiones Activos"
            description={`${activeTrucks} de ${trucks.length} camiones`}
            icon={<Truck className="h-6 w-6 text-blue-600" />}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-blue-600">{activeTrucks}</span>
              <Badge className="bg-blue-100 text-blue-800">{((activeTrucks / trucks.length) * 100).toFixed(0)}%</Badge>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Asignaciones Hoy"
            description="Despachos programados"
            icon={<MapPin className="h-6 w-6 text-green-600" />}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-green-600">{todayAssignments}</span>
              <Badge className="bg-green-100 text-green-800">Hoy</Badge>
            </div>
          </DashboardCard>

          <DashboardCard
            title="Combustible Remanente"
            description={`${trucksWithRemaining} camiones con remanente`}
            icon={<Fuel className="h-6 w-6 text-orange-600" />}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-orange-600">{trucksWithRemaining}</span>
              {trucksWithRemaining > 0 && (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Pendiente
                </Badge>
              )}
            </div>
          </DashboardCard>

          <DashboardCard
            title="Completados"
            description="Asignaciones finalizadas"
            icon={<FileText className="h-6 w-6 text-purple-600" />}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-purple-600">{completedAssignments}</span>
              <Badge className="bg-purple-100 text-purple-800">Total</Badge>
            </div>
          </DashboardCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <DashboardCard title="Acciones Rápidas" description="Gestión diaria del sistema">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/assignments/new">
                  <MapPin className="h-4 w-4 mr-2" />
                  Nueva Asignación
                </Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/trucks">
                  <Truck className="h-4 w-4 mr-2" />
                  Gestionar Camiones
                </Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Usuarios
                </Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/customers">
                  <Users className="h-4 w-4 mr-2" />
                  Gestionar Clientes
                </Link>
              </Button>
            </div>
          </DashboardCard>

          <DashboardCard title="Estado del Sistema" description="Resumen operacional">
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
          </DashboardCard>
        </div>

        {/* Reports Section */}
        <DashboardCard
          title="Reportes y Análisis"
          description="Acceso a reportes detallados del sistema"
          icon={<FileText className="h-6 w-6 text-indigo-600" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/reports">
                <FileText className="h-4 w-4 mr-2" />
                Reportes Generales
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/assignments">
                <MapPin className="h-4 w-4 mr-2" />
                Historial Asignaciones
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/analytics">
                <FileText className="h-4 w-4 mr-2" />
                Análisis Avanzado
              </Link>
            </Button>
          </div>
        </DashboardCard>
      </main>
    </div>
  )
}

// Export the component with dynamic import and SSR disabled
const AdminDashboard = dynamic(() => Promise.resolve(AdminDashboardContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
})

export default AdminDashboard