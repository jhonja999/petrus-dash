"use client"

import { useState, useEffect } from "react"
import { useApi } from "@/hooks/use-api"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { AssignmentColumns } from "./assignments-columns"
import { AssignmentForm } from "./assignment-form"
import { Droplet, Plus, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

// Add these interfaces at the top of the file
interface Truck {
  id: number
  placa: string
  typefuel: string
  capacitygal: string
  state: string
}

interface Driver {
  id: number
  name: string
  lastname: string
  email: string
  role: string
  state: string
}

export function AssignmentsClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

   // Use the useApi hook with proper caching to prevent excessive API calls
   const {
    data: assignments,
    isLoading,
    error,
    refetch,
  } = useApi<any[]>("/api/assignments", {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // Fetch trucks and drivers
  useEffect(() => {
    const fetchTrucksAndDrivers = async () => {
      try {
        const [trucksRes, driversRes] = await Promise.all([
          fetch("/api/trucks?state=Activo").then((res) => res.json()),
          fetch("/api/users?role=Conductor&state=Activo").then((res) => res.json()),
        ])

        setTrucks(trucksRes)
        setDrivers(driversRes.filter((driver: Driver) => driver.role.toLowerCase() === "conductor"))
      } catch (error) {
        console.error("Error fetching trucks or drivers:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los camiones o conductores",
          variant: "destructive",
        })
      }
    }

    fetchTrucksAndDrivers()
  }, [])

  const handleCreate = () => {
    setEditingAssignment(null)
    setIsFormOpen(true)
  }

  const handleEdit = (assignment: any) => {
    setEditingAssignment(assignment)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`/api/assignments?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar la asignación")
      }

      toast({
        title: "Asignación eliminada",
        description: "La asignación ha sido eliminada correctamente",
      })

      refetch()
    } catch (error) {
      console.error("Error deleting assignment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar la asignación",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    refetch()
  }

  if (isLoading) {
    return <Loading text="Cargando asignaciones..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive">Error al cargar las asignaciones: {error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  // Filter assignments based on search query
  const filteredAssignments = assignments
    ? assignments.filter((assignment) => {
        const searchFields = [
          assignment.truck?.placa,
          assignment.driver?.name,
          assignment.driver?.lastname,
          assignment.fuelType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return searchFields.includes(searchQuery.toLowerCase())
      })
    : []

  if (!assignments || assignments.length === 0) {
    return (
      <EmptyState
        title="No hay asignaciones registradas"
        description="Comienza agregando una nueva asignación al sistema."
        createNewText="Agregar asignación"
        icon={<Droplet className="h-12 w-12 text-muted-foreground" />}
        onClick={handleCreate}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Asignaciones</h2>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/assignment/new">
            <Plus className="mr-2 h-4 w-4" /> Agregar Asignación
          </Link>
        </Button>
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar asignación..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={AssignmentColumns({
          onEdit: handleEdit,
          onDelete: handleDelete,
          onView: (assignment) => {
            // Add view functionality here
            console.log("Viewing assignment:", assignment)
            // You could navigate to a detail page or open a modal
          },
        })}
        data={filteredAssignments}
        searchColumn="truck.placa"
        searchPlaceholder="Buscar por placa..."
      />

      {isFormOpen && (
        <AssignmentForm assignment={editingAssignment} onClose={handleFormClose} trucks={trucks} drivers={drivers} />
      )}
    </div>
  )
}
