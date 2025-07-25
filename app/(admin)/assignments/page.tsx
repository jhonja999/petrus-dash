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
import { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AssignmentsPage() {
  const { isAdmin, isLoading } = useAuth()
  const assignmentsData = useAssignments()
  const trucksData = useTruckState()
  const [drivers, setDrivers] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { assignments: rawAssignments, loading: assignmentsLoading, refreshAssignments } = assignmentsData
  const { trucks: rawTrucks, refreshTrucks } = trucksData

  // ✅ FIX: Asegurar que assignments siempre sea un array
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : []

  // ✅ FIX: Transform trucks data to match TruckData interface
  const trucks = useMemo(() => {
    if (!rawTrucks || !Array.isArray(rawTrucks)) return []
    
    return rawTrucks.map(truck => ({
      ...truck,
      capacitygal: Number(truck.capacitygal), // Convert Decimal to number
      lastRemaining: Number(truck.lastRemaining) // Convert Decimal to number if needed
    }))
  }, [rawTrucks])

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, router])

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const response = await axios.get("/api/users?role=conductor")
        setDrivers(response.data)
      } catch (error) {
        console.error("Error al obtener conductores:", error)
      }
    }
    fetchDrivers()
  }, [])

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

  if (isLoading || assignmentsLoading) {
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
          {refreshing ? "Actualizando..." : "Actualizar Estados"}
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
                              className={
                                assignment.isCompleted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                              }
                            >
                              {assignment.isCompleted ? "Completada" : "Activa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button asChild size="sm" variant="outline" disabled={assignment.isCompleted}>
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