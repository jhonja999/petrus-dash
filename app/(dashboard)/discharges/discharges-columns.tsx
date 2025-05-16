"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Edit, Trash2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface DischargeColumnsProps {
  onEdit: (discharge: any) => void
  onDelete: (id: number) => Promise<void>
}

export function DischargeColumns({ onEdit, onDelete }: DischargeColumnsProps): ColumnDef<any>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => {
        return formatDate(row.getValue("createdAt"))
      },
    },
    {
      accessorKey: "customer.companyname",
      header: "Cliente",
    },
    {
      accessorKey: "assignment.truck.placa",
      header: "Camión",
    },
    {
      accessorKey: "assignment.driver",
      header: "Conductor",
      cell: ({ row }) => {
        const driver = row.original.assignment.driver
        return `${driver.name} ${driver.lastname}`
      },
    },
    {
      accessorKey: "assignment.fuelType",
      header: "Combustible",
      cell: ({ row }) => {
        const fuelType = row.original.assignment.fuelType
        return <Badge variant="outline">{fuelType}</Badge>
      },
    },
    {
      accessorKey: "totalDischarged",
      header: "Descarga (gal)",
      cell: ({ row }) => {
        const totalDischarged = Number.parseFloat(row.getValue("totalDischarged"))
        return <span>{totalDischarged.toFixed(2)}</span>
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const discharge = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(discharge)}>
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              title="¿Eliminar descarga?"
              description="Esta acción no se puede deshacer. La descarga será eliminada permanentemente."
              onConfirm={() => onDelete(discharge.id)}
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
