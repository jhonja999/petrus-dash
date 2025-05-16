"use client"

import { useState } from "react"
import { useApi } from "@/hooks/use-api"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { TruckColumns } from "./trucks-columns"
import { TruckForm } from "./truck-form"
import { Truck, Plus, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export function TrucksClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTruck, setEditingTruck] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [stateFilter, setStateFilter] = useState("all")
  const [fuelFilter, setFuelFilter] = useState("all")

  const { data: trucks, isLoading, error, refetch } = useApi<any[]>("/api/trucks")

  const handleCreate = () => {
    setEditingTruck(null)
    setIsFormOpen(true)
  }

  const handleEdit = (truck: any) => {
    setEditingTruck(truck)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`/api/trucks?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar el camión")
      }

      toast({
        title: "Camión eliminado",
        description: "El camión ha sido eliminado correctamente",
      })

      refetch()
    } catch (error) {
      console.error("Error deleting truck:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el camión",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    refetch()
  }

  if (isLoading) {
    return <Loading text="Cargando camiones..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive">Error al cargar los camiones: {error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  // Filter trucks based on search query and filters
  const filteredTrucks = trucks
    ? trucks.filter((truck) => {
        const matchesSearch = truck.placa.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesState = stateFilter === "all" || truck.state === stateFilter
        const matchesFuel = fuelFilter === "all" || truck.typefuel === fuelFilter
        return matchesSearch && matchesState && matchesFuel
      })
    : []

  if (!trucks || trucks.length === 0) {
    return (
      <EmptyState
        title="No hay camiones registrados"
        description="Comienza agregando un nuevo camión al sistema."
        createNewText="Agregar camión"
        icon={<Truck className="h-12 w-12 text-muted-foreground" />}
        onClick={handleCreate}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Camiones</h2>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
            <Link href="/trucks/new">
              <Plus className="mr-2 h-4 w-4" /> Agregar Camión
            </Link>
          </Button>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
              <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
              <SelectItem value="Transito">En Tránsito</SelectItem>
              <SelectItem value="Descarga">En Descarga</SelectItem>
              <SelectItem value="Asignado">Asignado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={fuelFilter} onValueChange={setFuelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Combustible" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los combustibles</SelectItem>
              <SelectItem value="DIESEL_B5">Diesel B5</SelectItem>
              <SelectItem value="GASOLINA_90">Gasolina 90</SelectItem>
              <SelectItem value="GASOLINA_95">Gasolina 95</SelectItem>
              <SelectItem value="GLP">GLP</SelectItem>
              <SelectItem value="ELECTRICA">Eléctrica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={TruckColumns({
          onEdit: handleEdit,
          onDelete: handleDelete,
        })}
        data={filteredTrucks}
        searchColumn="placa"
        searchPlaceholder="Buscar por placa..."
      />

      {isFormOpen && <TruckForm truck={editingTruck} onClose={handleFormClose} />}
    </div>
  )
}
