"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useApi } from "@/hooks/use-api"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { CustomerColumns } from "./customers-columns"
import { CustomerForm } from "./customer-form"
import { Building2, Plus, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export function CustomersClient() {
  const router = useRouter() // Hook de navegación correctamente ubicado dentro del componente
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const { data: customers, isLoading, error, refetch } = useApi<any[]>("/api/customers")

  // Redirección automática cuando no hay registros
  useEffect(() => {
    if (customers && customers.length === 0) {
      router.push("/customers/new")
    }
  }, [customers, router])

  const handleCreate = () => {
    setEditingCustomer(null)
    setIsFormOpen(true)
  }

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar el cliente")
      }

      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      })

      refetch()
    } catch (error) {
      console.error("Error deleting customer:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el cliente",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    refetch()
  }

  if (isLoading) {
    return <Loading text="Cargando clientes..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive">Error al cargar los clientes: {error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  // Filter customers based on search query
  const filteredCustomers = customers
    ? customers.filter((customer) => {
        const searchFields = [customer.companyname, customer.ruc, customer.address].join(" ").toLowerCase()
        return searchFields.includes(searchQuery.toLowerCase())
      })
    : []

  if (!customers || customers.length === 0) {
    return (
      <EmptyState
        title="No hay clientes registrados"
        description="Comienza agregando un nuevo cliente al sistema."
        createNewText="Agregar cliente"
        icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
        onClick={handleCreate}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" /> Agregar Cliente
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={CustomerColumns({
          onEdit: handleEdit,
          onDelete: handleDelete,
        })}
        data={filteredCustomers}
        searchColumn="companyname"
        searchPlaceholder="Buscar por nombre..."
      />

      {isFormOpen && <CustomerForm customer={editingCustomer} onClose={handleFormClose} />}
    </div>
  )
}