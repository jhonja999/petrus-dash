"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Edit, Trash2, Eye } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface AssignmentColumnsProps {
  onEdit: (assignment: any) => void
  onDelete: (id: number) => Promise<void>
  onView: (assignment: any) => void
}

export function AssignmentColumns({ onEdit, onDelete, onView }: AssignmentColumnsProps): ColumnDef<any>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row }) => {
        return formatDate(row.getValue("createdAt"))
      },
    },
    {
      accessorKey: "truck.placa",
      header: "Camión",
    },
    {
      accessorKey: "driver",
      header: "Conductor",
      cell: ({ row }) => {
        const driver = row.original.driver
        return `${driver.name} ${driver.lastname}`
      },
    },
    {
      accessorKey: "fuelType",
      header: "Combustible",
      cell: ({ row }) => {
        const fuelType = row.getValue("fuelType") as string
        return <Badge variant="outline">{fuelType}</Badge>
      },
    },
    {
      accessorKey: "totalLoaded",
      header: "Carga Total (gal)",
      cell: ({ row }) => {
        const totalLoaded = Number.parseFloat(row.getValue("totalLoaded"))
        return <span>{totalLoaded.toFixed(2)}</span>
      },
    },
    {
      accessorKey: "totalRemaining",
      header: "Restante (gal)",
      cell: ({ row }) => {
        const totalRemaining = Number.parseFloat(row.getValue("totalRemaining"))
        const totalLoaded = Number.parseFloat(row.getValue("totalLoaded"))
        const percentage = (totalRemaining / totalLoaded) * 100

        let badgeVariant: "default" | "outline" | "secondary" = "default"
        if (percentage <= 0) {
          badgeVariant = "outline"
        } else if (percentage < 50) {
          badgeVariant = "secondary"
        }

        return (
          <Badge variant={badgeVariant}>
            {totalRemaining.toFixed(2)} ({percentage.toFixed(0)}%)
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const assignment = row.original

        return (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => onView(assignment)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(assignment)}>
              <Edit className="h-4 w-4" />
            </Button>
            <ConfirmDialog
              title="¿Eliminar asignación?"
              description={`¿Estás seguro de que deseas eliminar esta asignación? Esta acción no se puede deshacer.`}
              onConfirm={() => onDelete(assignment.id)}
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
