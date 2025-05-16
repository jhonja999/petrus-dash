"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Edit, Trash2 } from "lucide-react"

interface CustomerColumnsProps {
  onEdit: (customer: any) => void
  onDelete: (id: number) => Promise<void>
}

export function CustomerColumns({ onEdit, onDelete }: CustomerColumnsProps): ColumnDef<any>[] {
  return [
    {
      accessorKey: "companyname",
      header: "Empresa",
    },
    {
      accessorKey: "ruc",
      header: "RUC",
    },
    {
      accessorKey: "address",
      header: "Dirección",
      cell: ({ row }) => {
        const address = row.getValue("address") as string
        return address.length > 30 ? `${address.substring(0, 30)}...` : address
      },
    },
    {
      accessorKey: "contactName",
      header: "Contacto",
      cell: ({ row }) => {
        const contactName = row.original.contactName
        return contactName || "—"
      },
    },
    {
      accessorKey: "contactPhone",
      header: "Teléfono",
      cell: ({ row }) => {
        const contactPhone = row.original.contactPhone
        return contactPhone || "—"
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const customer = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(customer)}>
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              title="¿Eliminar cliente?"
              description={`¿Estás seguro de que deseas eliminar al cliente ${customer.companyname}? Esta acción no se puede deshacer.`}
              onConfirm={() => onDelete(customer.id)}
              variant="destructive"
            >
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </ConfirmDialog>
          </div>
        )
      },
    },
  ]
}
