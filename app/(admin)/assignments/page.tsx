"use client"

import { useAssignments } from "@/hooks/useAssignments"
import { useTrucks } from "@/hooks/use-trucks"
import { useAuth } from "@/hooks/useAuth"
import { AssignmentForm } from "@/components/AssignmentForm"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Link from "next/link"
import { useRouter } from "next/navigation"
import React, { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { 
  RefreshCw, 
  ImageIcon, 
  Settings2, 
  Users, 
  Truck, 
  ClipboardList, 
  Eye,
  ArrowRight,
  Package,
  Download,
  X
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { FuelType } from "@/types/globals"
import { AssignmentImageGallery } from "@/components/AssignmentImageGallery"

// Definir las columnas disponibles
const AVAILABLE_COLUMNS = [
  { key: 'truck', label: 'Camión', defaultVisible: true },
  { key: 'driver', label: 'Conductor', defaultVisible: true },
  { key: 'fuel', label: 'Combustible', defaultVisible: true },
  { key: 'loaded', label: 'Carga Total', defaultVisible: true },
  { key: 'remaining', label: 'Remanente', defaultVisible: true },
  { key: 'date', label: 'Fecha', defaultVisible: false },
  { key: 'status', label: 'Estado', defaultVisible: true },
  { key: 'actions', label: 'Acciones', defaultVisible: true }
]

export default function AssignmentsPage() {
  const authData = useAuth()
  const assignmentsData = useAssignments()
  const trucksData = useTrucks()
  const [mounted, setMounted] = useState(false)
  const [drivers, setDrivers] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    AVAILABLE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: col.defaultVisible }), {})
  )
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

  const handleToggleColumn = (columnKey: string) => {
    setVisibleColumns(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }))
  }

  const handleShowEvidence = (assignment: any) => {
    setSelectedAssignment(assignment)
    setShowEvidenceModal(true)
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
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">
                  Asignaciones Recientes ({assignments.length})
                </CardTitle>
                
                {/* Selector de columnas */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Columnas
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Mostrar columnas</h4>
                      {AVAILABLE_COLUMNS.map((column) => (
                        <div key={column.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={column.key}
                            checked={visibleColumns[column.key]}
                            onCheckedChange={() => handleToggleColumn(column.key)}
                          />
                          <label
                            htmlFor={column.key}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {column.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              {assignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.truck && <TableHead>Camión</TableHead>}
                        {visibleColumns.driver && <TableHead>Conductor</TableHead>}
                        {visibleColumns.fuel && <TableHead>Combustible</TableHead>}
                        {visibleColumns.loaded && <TableHead>Carga Total</TableHead>}
                        {visibleColumns.remaining && <TableHead>Remanente</TableHead>}
                        {visibleColumns.date && <TableHead>Fecha</TableHead>}
                        {visibleColumns.status && <TableHead>Estado</TableHead>}
                        {visibleColumns.actions && <TableHead>Gestión</TableHead>}
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
                          <TableRow key={assignment.id} className="hover:bg-gray-50">
                            {visibleColumns.truck && (
                              <TableCell className="font-medium">{truckPlaca}</TableCell>
                            )}
                            {visibleColumns.driver && (
                              <TableCell>{driverName}</TableCell>
                            )}
                            {visibleColumns.fuel && (
                              <TableCell>
                                <Badge variant="outline">{assignment.fuelType || "N/A"}</Badge>
                              </TableCell>
                            )}
                            {visibleColumns.loaded && (
                              <TableCell>{totalLoaded}</TableCell>
                            )}
                            {visibleColumns.remaining && (
                              <TableCell className="font-semibold text-blue-600">{totalRemaining}</TableCell>
                            )}
                            {visibleColumns.date && (
                              <TableCell>{createdAt}</TableCell>
                            )}
                            {visibleColumns.status && (
                              <TableCell>
                                <Badge
                                  className={
                                    assignment.isCompleted 
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-yellow-100 text-yellow-800"
                                  }
                                >
                                  {assignment.isCompleted ? "Completada" : "Activa"}
                                </Badge>
                              </TableCell>
                            )}
                            {visibleColumns.actions && (
                              <TableCell>
                                <div className="flex gap-2">
                                  {/* Gestión Principal - Destacada */}
                                  <Button 
                                    asChild 
                                    size="sm" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1" 
                                    disabled={assignment.isCompleted}
                                  >
                                    <Link href={`/assignments/${assignment.id}/clients`}>
                                      <ClipboardList className="h-3 w-3" />
                                      Gestionar
                                      <ArrowRight className="h-3 w-3" />
                                    </Link>
                                  </Button>
                                  
                                  {/* Evidencias */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleShowEvidence(assignment)}
                                    className="flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Evidencias
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Package className="h-12 w-12 text-gray-400" />
                    <div>
                      <p className="text-gray-500 mb-2">No hay asignaciones registradas</p>
                      <p className="text-sm text-gray-400 mb-4">Crea la primera asignación para comenzar</p>
                    </div>
                    <Button asChild variant="outline">
                      <Link href="/assignments/new">Crear Primera Asignación</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Evidencias */}
      <Dialog open={showEvidenceModal} onOpenChange={setShowEvidenceModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Evidencias de Asignación
                {selectedAssignment && (
                  <Badge variant="outline" className="ml-2">
                    {selectedAssignment.truck?.placa || "N/A"}
                  </Badge>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEvidenceModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          
          {selectedAssignment && (
            <div className="space-y-6 mt-4">
              {/* Información de la asignación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Información de la Asignación
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Camión:</span>
                      <p className="font-semibold">{selectedAssignment.truck?.placa || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Conductor:</span>
                      <p className="font-semibold">
                        {selectedAssignment.driver 
                          ? `${selectedAssignment.driver.name} ${selectedAssignment.driver.lastname}`
                          : "N/A"
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Combustible:</span>
                      <p className="font-semibold">{selectedAssignment.fuelType || "N/A"}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Estado:</span>
                      <Badge
                        className={
                          selectedAssignment.isCompleted 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {selectedAssignment.isCompleted ? "Completada" : "Activa"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Evidencias de Carga */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-green-600" />
                    Evidencias de Carga
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <AssignmentImageGallery 
                    assignmentId={selectedAssignment.id} 
                    type="loading" 
                  />
                </CardContent>
              </Card>

              {/* Evidencias de Descarga */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    Evidencias de Descarga
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <AssignmentImageGallery 
                    assignmentId={selectedAssignment.id} 
                    type="unloading" 
                  />
                </CardContent>
              </Card>

              {/* Botón de gestión dentro del modal */}
              <div className="flex justify-end pt-4 border-t">
                <Button asChild className="bg-blue-600 hover:bg-blue-700">
                  <Link href={`/assignments/${selectedAssignment.id}/clients`}>
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Ir a Gestión de Clientes y Despachos
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}