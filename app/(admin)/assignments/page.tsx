"use client"

import { useAssignments } from "@/hooks/useAssignments"
import { useTruckState } from "@/hooks/useTruckState"
import { useAuth } from "@/hooks/useAuth"
import { AssignmentForm } from "@/components/AssignmentForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { User } from "@/types/globals"

export default function AssignmentsPage() {
  const authData = useAuth()
  const assignmentsData = useAssignments()
  const trucksData = useTruckState()
  const [mounted, setMounted] = useState(false)
  const [drivers, setDrivers] = useState<User[]>([])
  const [driversLoading, setDriversLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const { isAdmin, isLoading } = authData
  const { assignments: rawAssignments, loading: assignmentsLoading, refreshAssignments } = assignmentsData
  const { trucks, refreshTrucks } = trucksData

  // ✅ FIX: Asegurar que assignments siempre sea un array
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : []

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
      setDriversLoading(true)
      console.log("🔄 Fetching drivers for assignments page...")

      try {
        // First try to get OPERADOR users specifically
        const response = await axios.get("/api/users", {
          params: { role: "OPERADOR" },
        })

        console.log("📋 Drivers API response:", response.data)

        if (Array.isArray(response.data) && response.data.length > 0) {
          setDrivers(response.data)
          console.log("✅ Successfully loaded drivers:", response.data.length)
        } else {
          console.log("⚠️ No OPERADOR users found, trying fallback...")

          // Fallback: get all users and filter by role
          const allUsersResponse = await axios.get("/api/users")
          const allUsers = allUsersResponse.data as User[]
          const operadores = Array.isArray(allUsers) ? allUsers.filter((user) => user.role === "OPERADOR") : []

          console.log("📋 Fallback - All users:", allUsers.length, "Operadores found:", operadores.length)
          setDrivers(operadores)
        }
      } catch (error) {
        console.error("❌ Error fetching drivers:", error)
        setDrivers([])
        toast({
          title: "Error",
          description: "Error al cargar la lista de conductores",
          variant: "destructive",
        })
      } finally {
        setDriversLoading(false)
      }
    }

    fetchDrivers()
  }, [mounted, toast])

  // Add this useEffect after the existing ones
  useEffect(() => {
    if (!mounted || !isAdmin) return

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(() => {
      console.log("🔄 Auto-refreshing assignments data...")
      refreshAssignments()
    }, 30000)

    return () => clearInterval(interval)
  }, [mounted, isAdmin, refreshAssignments])

  const handleAssignmentSuccess = async () => {
    // Refrescar asignaciones y camiones
    await Promise.all([refreshTrucks(), refreshAssignments()])

    // Force a refresh of the assignments list to show updated status
    setTimeout(() => {
      refreshAssignments()
    }, 1000)
  }

  const handleManualRefresh = async () => {
    if (refreshing) return

    setRefreshing(true)
    console.log("👤 Manual refresh initiated from assignments page")

    try {
      // First refresh truck statuses
      const statusResponse = await axios.post("/api/trucks/refresh-status")

      // Then refresh both trucks and assignments data
      await Promise.all([refreshTrucks(), refreshAssignments()])

      // Also refresh drivers
      const driversResponse = await axios.get("/api/users", {
        params: { role: "OPERADOR" },
      })
      setDrivers(driversResponse.data)

      toast({
        title: "Estados actualizados",
        description: statusResponse.data.message,
      })

      console.log("✅ Manual refresh completed successfully")
    } catch (error) {
      console.error("Error in manual refresh:", error)
      toast({
        title: "Error",
        description: "Error al actualizar estados",
        variant: "destructive",
      })
    } finally {
      setTimeout(() => {
        setRefreshing(false)
      }, 2000)
    }
  }

  // Si aún no se ha montado, renderizar un placeholder mínimo
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isLoading || assignmentsLoading || driversLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-600">Acceso No Autorizado</p>
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
        <Button
          onClick={handleManualRefresh}
          disabled={refreshing}
          variant="ghost"
          size="sm"
          className="flex items-center gap-2 hover:bg-gray-100 transition-colors duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualizando..." : "Actualizar"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <AssignmentForm
            trucks={trucks}
            drivers={drivers}
            onSuccess={handleAssignmentSuccess}
            refreshing={refreshing}
          />
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Asignaciones Recientes ({assignments.length})</h2>
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

                      // ✅ FIX: Usar completedAt en lugar de isCompleted
                      const isCompleted = assignment.completedAt !== null

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
                            <Badge
                              className={isCompleted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                            >
                              {isCompleted ? "Completada" : "Activa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button asChild size="sm" variant="outline" disabled={isCompleted}>
                              <Link href={`/assignments/${assignment.id}/clients`}>Gestionar Clientes</Link>
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
                <p className="text-gray-500 mb-4">No hay asignaciones registradas</p>
                <Button asChild variant="outline">
                  <Link href="/assignments/new">Crear Primera Asignación</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
