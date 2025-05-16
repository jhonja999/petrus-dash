"use client"

import { useState } from "react"
import { useApi } from "@/hooks/use-api"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { DischargeColumns } from "./discharges-columns"
import { DischargeForm } from "./discharge-form"
import { Droplets } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export function DischargesClient() {
  const [isCreating, setIsCreating] = useState(false)
  const [editingDischarge, setEditingDischarge] = useState<any | null>(null)

  const { data: discharges, isLoading, error, refetch } = useApi<any[]>("/api/discharges")

  const handleCreate = () => {
    setEditingDischarge(null)
    setIsCreating(true)
  }

  const handleEdit = (discharge: any) => {
    setEditingDischarge(discharge)
    setIsCreating(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/discharges?id=${id}`, { method: "DELETE" })
      toast({
        title: "Descarga eliminada",
        description: "La descarga ha sido eliminada correctamente",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la descarga",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = () => {
    setIsCreating(false)
    setEditingDischarge(null)
    refetch()
  }

  if (isLoading) {
    return <Loading text="Cargando descargas..." />
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">Error al cargar las descargas: {error.message}</p>
        <Button onClick={refetch} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  if (!discharges || discharges.length === 0) {
    return (
      <EmptyState
        title="No hay descargas registradas"
        description="Comienza agregando una nueva descarga al sistema."
        createNewText="Agregar descarga"
        createNewHref="#"
        icon={<Droplets className="h-12 w-12 text-muted-foreground" />}
        onClick={handleCreate}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>Agregar descarga</Button>
      </div>

      <DataTable
        columns={DischargeColumns({
          onEdit: handleEdit,
          onDelete: handleDelete,
        })}
        data={discharges}
        searchColumn="customer.companyname"
        searchPlaceholder="Buscar por cliente..."
      />

      {isCreating && <DischargeForm discharge={editingDischarge} onClose={handleFormClose} />}
    </div>
  )
}
