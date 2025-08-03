"use client"

import { useAssignments } from "@/hooks/useAssignments"
import { useTrucks } from "@/hooks/use-trucks"
import { useAuth } from "@/hooks/useAuth"
import { AssignmentForm } from "@/components/AssignmentForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { RefreshCw, ImageIcon } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { FuelType } from "@/types/globals"
import { AssignmentImageGallery } from "@/components/AssignmentImageGallery"

export default function AssignmentsPage() {
  const authData = useAuth()
  const assignmentsData = useAssignments()
  const trucksData = useTrucks()
  const [mounted, setMounted] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [expandedAssignment, setExpandedAssignment] = useState<number | null>(null)
  const [galleryAssignment, setGalleryAssignment] = useState<null | { id: number, placa: string, driver: string }>(null)
  const router = useRouter()
  const { toast } = useToast()

  const { isAdmin, isLoading } = authData
  const { assignments: rawAssignments, loading: assignmentsLoading, refreshAssignments } = assignmentsData
  const { trucks: rawTrucks, refresh: refreshTrucks } = trucksData

  // ✅ FIX: Asegurar que assignments siempre sea un array
  const assignments = Array.isArray(rawAssignments) ? rawAssignments : []

  // ✅ FIX: Transform trucks data to match TruckData interface
  const trucks = useMemo(() => {
    if (!rawTrucks || !Array.isArray(rawTrucks)) return []
    
    return rawTrucks.map(truck => ({
      ...truck,
      capacitygal: Number(truck.capacitygal), // Convert Decimal to number
      lastRemaining: Number(truck.lastRemaining), // Convert Decimal to number if needed
      typefuel: truck.typefuel as FuelType, // Ensure proper type casting
      customFuelType: (truck as any).customFuelType || undefined
    }))
  }, [rawTrucks])

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
        const response = await axios.get("/api/users?role=conductor")
        setDrivers(response.data)
      } catch (error) {
        console.error("Error al obtener conductores:", error)
      }
    }
    fetchDrivers()
  }, [mounted])

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

  // Si aún no se ha montado, renderizar un placeholder mínimo
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
            <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sticky top-0 z-10 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Asignaciones Recientes <span className="text-xs text-gray-500">({assignments.length})</span></h2>
              <span className="text-xs text-gray-500 hidden sm:inline">Desliza horizontalmente para ver más columnas</span>
            </div>
            {assignments.length > 0 ? (
              <div className="overflow-x-auto">
                <Table className="min-w-full text-sm">
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="min-w-[120px]">Camión</TableHead>
                      <TableHead className="min-w-[120px]">Conductor</TableHead>
                      <TableHead className="min-w-[90px]">Combustible</TableHead>
                      <TableHead className="min-w-[90px]">Carga Total</TableHead>
                      <TableHead className="min-w-[90px]">Remanente</TableHead>
                      <TableHead className="min-w-[100px]">Fecha</TableHead>
                      <TableHead className="min-w-[90px]">Estado</TableHead>
                      <TableHead className="min-w-[120px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.slice(0, 10).map((assignment) => {
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
                        <TableRow key={assignment.id} className="align-top">
                          <TableCell className="font-medium whitespace-nowrap">{truckPlaca}</TableCell>
                          <TableCell className="whitespace-nowrap">{driverName}</TableCell>
                          <TableCell><Badge variant="outline">{assignment.fuelType || "N/A"}</Badge></TableCell>
                          <TableCell>{totalLoaded}</TableCell>
                          <TableCell className="font-semibold text-blue-600">{totalRemaining}</TableCell>
                          <TableCell>{createdAt}</TableCell>
                          <TableCell>
                            <Badge className={assignment.isCompleted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                              {assignment.isCompleted ? "Completada" : "Activa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button asChild size="sm" variant="outline" disabled={assignment.isCompleted} className="w-full sm:w-auto">
                                <Link href={`/assignments/${assignment.id}/clients`}>Gestionar</Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full sm:w-auto"
                                onClick={() => setGalleryAssignment({ id: assignment.id, placa: truckPlaca, driver: driverName })}
                                title="Ver evidencias"
                              >
                                <ImageIcon className="h-4 w-4" />
                                <span className="sr-only">Evidencias</span>
                              </Button>
                            </div>
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

      {/* Drawer/Modal para galería de evidencias */}
      <Dialog open={!!galleryAssignment} onOpenChange={() => setGalleryAssignment(null)}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>
              Evidencias de Asignación
              {galleryAssignment && (
                <span className="block text-xs font-normal text-gray-500 mt-1">
                  Camión: <span className="font-semibold">{galleryAssignment.placa}</span> | Conductor: <span className="font-semibold">{galleryAssignment.driver}</span>
                </span>
              )}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="absolute right-2 top-2">
                <span className="sr-only">Cerrar</span>
                ×
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="space-y-6">
            {galleryAssignment && ["carga", "descarga"].map((tipo) => (
              <div key={tipo} className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold capitalize text-gray-700">Evidencias de {tipo}</span>
                </div>
                <AssignmentImageGallery assignmentId={galleryAssignment.id} type={tipo === "carga" ? "loading" : "unloading"} />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}