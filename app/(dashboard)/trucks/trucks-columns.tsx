"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

// Define the Truck type to match your database schema
export type Truck = {
  id: number
  placa: string
  typefuel: string
  capacitygal: number
  state: string
  createdAt: string
  updatedAt: string
}

// Helper function to get the badge color based on the truck state
const getStateColor = (state: string) => {
  switch (state) {
    case "Activo":
      return "bg-green-500"
    case "Inactivo":
      return "bg-gray-500"
    case "Mantenimiento":
      return "bg-yellow-500"
    case "Transito":
      return "bg-blue-500"
    case "Descarga":
      return "bg-purple-500"
    case "Asignado":
      return "bg-indigo-500"
    default:
      return "bg-gray-500"
  }
}

// Helper function to format the fuel type for display
const formatFuelType = (fuelType: string) => {
  switch (fuelType) {
    case "DIESEL_B5":
      return "Diesel B5"
    case "GASOLINA_90":
      return "Gasolina 90"
    case "GASOLINA_95":
      return "Gasolina 95"
    case "GLP":
      return "GLP"
    case "ELECTRICA":
      return "Eléctrica"
    default:
      return fuelType
  }
}

interface TruckColumnsProps {
  onEdit: (truck: Truck) => void
  onDelete: (id: number) => Promise<void>
}

export const TruckColumns = ({ onEdit, onDelete }: TruckColumnsProps): ColumnDef<Truck>[] => [
  {
    accessorKey: "placa",
    header: "Placa",
  },
  {
    accessorKey: "typefuel",
    header: "Tipo de Combustible",
    cell: ({ row }) => formatFuelType(row.getValue("typefuel")),
  },
  {
    accessorKey: "capacitygal",
    header: "Capacidad (gal)",
    cell: ({ row }) => {
      const capacity = Number.parseFloat(row.getValue("capacitygal"))
      return `${capacity.toFixed(2)} gal`
    },
  },
  {
    accessorKey: "state",
    header: "Estado",
    cell: ({ row }) => {
      const state = row.getValue("state") as string
      return <Badge className={`${getStateColor(state)} text-white`}>{state}</Badge>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const truck = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(truck)}>
              <Edit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <ConfirmDialog
                title="Eliminar camión"
                description="¿Estás seguro de que deseas eliminar este camión? Esta acción no se puede deshacer."
                onConfirm={() => onDelete(truck.id)}
                variant="destructive"
              >
                <div className="flex items-center">
                  <Trash className="mr-2 h-4 w-4" /> Eliminar
                </div>
              </ConfirmDialog>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
