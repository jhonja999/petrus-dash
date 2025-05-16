"use client"

import { useState } from "react"
import { useApi } from "@/hooks/use-api"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { UserColumns } from "./users-columns"
import { UserForm } from "./user-form"
import { Users, Plus, Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"

export function UsersClient() {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [stateFilter, setStateFilter] = useState("all")

  const { data: users, isLoading, error, refetch } = useApi<any[]>("/api/users")

  const handleCreate = () => {
    setEditingUser(null)
    setIsFormOpen(true)
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al eliminar el usuario")
      }

      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente",
      })

      refetch()
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al eliminar el usuario",
        variant: "destructive",
      })
    }
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    refetch()
  }

  if (isLoading) {
    return <Loading text="Cargando usuarios..." />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-destructive">Error al cargar los usuarios: {error.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          Reintentar
        </Button>
      </div>
    )
  }

  // Filter users based on search query and filters
  const filteredUsers = users
    ? users.filter((user) => {
        const searchFields = [user.name, user.lastname, user.email, user.dni].join(" ").toLowerCase()
        const matchesSearch = searchFields.includes(searchQuery.toLowerCase())
        const matchesRole = roleFilter === "all" || user.role === roleFilter
        const matchesState = stateFilter === "all" || user.state === stateFilter
        return matchesSearch && matchesRole && matchesState
      })
    : []

  if (!users || users.length === 0) {
    return (
      <EmptyState
        title="No hay usuarios registrados"
        description="Comienza agregando un nuevo usuario al sistema."
        createNewText="Agregar usuario"
        icon={<Users className="h-12 w-12 text-muted-foreground" />}
        onClick={handleCreate}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
          <Link href="/users/new">
            <Plus className="mr-2 h-4 w-4" /> Agregar Usuario
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuario..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="conductor">Conductor</SelectItem>
              <SelectItem value="operador">Operador</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={UserColumns({
          onEdit: handleEdit,
          onDelete: handleDelete,
        })}
        data={filteredUsers}
        searchColumn="name"
        searchPlaceholder="Buscar por nombre..."
      />

      {isFormOpen && <UserForm user={editingUser} onClose={handleFormClose} />}
    </div>
  )
}
