"use client"

import { useAssignments } from "@/hooks/useAssignments"
import { useTruckState } from "@/hooks/useTruckState"
import { useAuth } from "@/hooks/useAuth"
import { AssignmentForm } from "@/components/AssignmentForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Truck, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import { toast } from "sonner"

export default function AssignmentsPage() {
  const authData = useAuth()
  const assignmentsData = useAssignments()
  const trucksData = useTruckState()
  const [mounted, setMounted] = useState(false)
  const [drivers, setDrivers] = useState<any[]>([])
  const [loadingDrivers, setLoadingDrivers] = useState(true)
  const router = useRouter()

  const { isAdmin, isLoading } = authData
  const { assignments: rawAssignments, loading: assignmentsLoading, setAssignments } = assignmentsData
  const { trucks } = trucksData

  // ✅ FIX: Asegurar que assignments siempre sea un array
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : []

  // ✅ Helper functions para contadores seguros
  const getActiveTrucksCount = () => {
    if (!Array.isArray(trucks)) return 0
    return trucks.filter((truck: any) => truck?.state === 'Activo').length
  }

  const getActiveDriversCount = () => {
    if (!Array.isArray(drivers)) return 0
    return drivers.filter((driver: any) => driver?.state === 'Activo').length
  }

  const getActiveAssignmentsCount = () => {
    if (!Array.isArray(assignments)) return 0
    return assignments.filter((assignment: any) => !assignment?.isCompleted).length
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  useEffect(() => {
    if (!mounted) return

    const fetchDrivers = async () => {
      try {
        toast.info("Cargando conductores...")
        
        const response = await axios.get("/api/users?role=conductor")
        setDrivers(response.data)
        
        toast.success("✅ Datos cargados", {
          description: `${response.data.length} conductores disponibles.`,
        })
        
        // Show additional info if no drivers
        if (response.data.length === 0) {
          setTimeout(() => {
            toast.warning("⚠️ Sin conductores", {
              description: "No hay conductores registrados en el sistema.",
            })
          }, 1000)
        }
      } catch (error) {
        console.error("Error al obtener conductores:", error)
        toast.error("❌ Error al cargar", {
          description: "No se pudieron cargar los conductores.",
        })
      } finally {
        setLoadingDrivers(false)
      }
    }
    fetchDrivers()
  }, [mounted])

  const handleAssignmentSuccess = () => {
    toast.success("✅ ¡Asignación creada!", {
      description: "Actualizando lista de asignaciones...",
    })
    
    // Refrescar asignaciones
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  // Si aún no se ha montado, renderizar un placeholder mínimo
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isLoading || assignmentsLoading || loadingDrivers) {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Asignaciones</h1>
          <p className="text-sm text-gray-600">Asignar camiones y combustible a conductores</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Volver al Dashboard</Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Camiones Disponibles</p>
              <p className="text-lg font-semibold">{getActiveTrucksCount()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Conductores Activos</p>
              <p className="text-lg font-semibold">{getActiveDriversCount()}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Plus className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Asignaciones Activas</p>
              <p className="text-lg font-semibold">{getActiveAssignmentsCount()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <AssignmentForm 
              trucks={trucks || []} 
              drivers={drivers || []} 
              onSuccess={handleAssignmentSuccess} 
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Asignaciones Recientes ({assignments.length})
              </h2>
            </div>
            {assignments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Camión</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Combustible</TableHead>
                      <TableHead>Carga Total</TableHead>
                      <TableHead>Remanente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.slice(0, 10).map((assignment) => {
                      // Add safety checks for nested objects
                      const truckPlaca = assignment?.truck?.placa || "N/A"
                      const driverName = assignment?.driver
                        ? `${assignment.driver.name} ${assignment.driver.lastname}`
                        : "N/A"
                      const totalLoaded = assignment?.totalLoaded?.toString() || "0"
                      const totalRemaining = assignment?.totalRemaining?.toString() || "0"
                      const createdAt = assignment?.createdAt
                        ? new Date(assignment.createdAt).toLocaleDateString()
                        : "N/A"

                      return (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{truckPlaca}</TableCell>
                          <TableCell>{driverName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.fuelType || "N/A"}</Badge>
                          </TableCell>
                          <TableCell>{totalLoaded}</TableCell>
                          <TableCell className="font-semibold text-blue-600">{totalRemaining}</TableCell>
                          <TableCell>{createdAt}</TableCell>
                          <TableCell>
                            <Badge className={assignment.isCompleted ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"}>
                              {assignment.isCompleted ? "Completada" : "Activa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button asChild size="sm" variant="outline" disabled={assignment.isCompleted}>
                              <Link href={`/assignments/${assignment.id}/clients`}>
                                Gestionar Clientes
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <div className="mb-4">
                  <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No hay asignaciones registradas</p>
                  <p className="text-sm text-gray-400">Usa el formulario de la izquierda para crear la primera asignación</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}