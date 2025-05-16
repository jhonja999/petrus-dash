"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Edit } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"
import { Eye, Trash } from "lucide-react"

interface UserColumnsProps {
  onEdit: (user: any) => void
  onDelete: (id: number) => Promise<void>
}

export function UserColumns({ onEdit, onDelete }: UserColumnsProps): ColumnDef<any>[] {
  const { sessionClaims } = useAuth()
  const userRole = sessionClaims?.metadata?.role as string
  const isAdmin = userRole === "admin"

  return [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => {
        const lastname = row.original.lastname || ""
        return <span>{`${row.getValue("name")} ${lastname}`}</span>
      },
    },
    {
      accessorKey: "dni",
      header: "DNI",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => {
        const role = row.getValue("role") as string
        const roleMap: Record<string, { label: string; variant: "default" | "outline" | "secondary" }> = {
          Conductor: { label: "Conductor", variant: "default" },
          ADMIN: { label: "Administrador", variant: "secondary" },
        }

        const { label, variant } = roleMap[role] || { label: role, variant: "outline" }

        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      accessorKey: "state",
      header: "Estado",
      cell: ({ row }) => {
        const state = row.getValue("state") as string
        const stateMap: Record<
          string,
          { label: string; variant: "default" | "outline" | "secondary" | "destructive" }
        > = {
          Activo: { label: "Activo", variant: "default" },
          Inactivo: { label: "Inactivo", variant: "outline" },
          Suspendido: { label: "Suspendido", variant: "destructive" },
          Eliminado: { label: "Eliminado", variant: "destructive" },
          Asignado: { label: "Asignado", variant: "secondary" },
        }

        const { label, variant } = stateMap[state] || { label: state, variant: "outline" }

        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      accessorKey: "createdAt",
      header: "Fecha Registro",
      cell: ({ row }) => {
        const date = row.original.createdAt
        return date ? formatDate(date) : "N/A"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => {}}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">Ver detalles</span>
            </Button>

            {isAdmin && (
              <>
                <Button variant="ghost" size="icon" onClick={() => onEdit(user)}>
                  <Edit className="h-4 w-4" />
                  <span className="sr-only">Editar</span>
                </Button>

                <ConfirmDialog
                  title="¿Eliminar usuario?"
                  description={`¿Estás seguro de que deseas eliminar al usuario ${user.name} ${user.lastname}? Esta acción no se puede deshacer.`}
                  onConfirm={() => onDelete(user.id)}
                  variant="destructive"
                >
                  <Button variant="ghost" size="icon">
                    <Trash className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                </ConfirmDialog>
              </>
            )}
          </div>
        )
      },
    },
  ]
}
