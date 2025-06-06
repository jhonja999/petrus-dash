"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Eye } from "lucide-react"
import Link from "next/link"
import type { Truck } from "@/types/globals"

interface TruckTableProps {
  trucks: Truck[]
  onUpdateState?: (truckId: number, newState: string) => void
  onRefreshTrucks?: () => void
  isAdmin?: boolean
}

const stateColors = {
  Activo: "bg-green-100 text-green-800",
  Inactivo: "bg-gray-100 text-gray-800",
  Mantenimiento: "bg-yellow-100 text-yellow-800",
  Transito: "bg-blue-100 text-blue-800",
  Descarga: "bg-purple-100 text-purple-800",
  Asignado: "bg-orange-100 text-orange-800",
}

const fuelTypeLabels = {
  DIESEL_B5: "Diésel B5",
  GASOLINA_90: "Gasolina 90",
  GASOLINA_95: "Gasolina 95",
  GLP: "GLP",
  ELECTRICA: "Eléctrica",
}

export function TruckTable({ trucks, onUpdateState, onRefreshTrucks, isAdmin = false }: TruckTableProps) {
  const [selectedStates, setSelectedStates] = useState<Record<number, string>>({})

  const handleStateChange = (truckId: number, newState: string) => {
    setSelectedStates((prev) => ({ ...prev, [truckId]: newState }))
    onUpdateState?.(truckId, newState)
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Placa</TableHead>
            <TableHead className="font-semibold">Tipo Combustible</TableHead>
            <TableHead className="font-semibold">Capacidad (Gal)</TableHead>
            <TableHead className="font-semibold">Remanente</TableHead>
            <TableHead className="font-semibold">Estado</TableHead>
            <TableHead className="font-semibold">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trucks.map((truck) => (
            <TableRow key={truck.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{truck.placa}</TableCell>
              <TableCell>{fuelTypeLabels[truck.typefuel]}</TableCell>
              <TableCell>{truck.capacitygal.toString()}</TableCell>
              <TableCell className="font-semibold text-blue-600">{truck.lastRemaining.toString()}</TableCell>
              <TableCell>
                <Badge className={stateColors[truck.state]}>{truck.state}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {isAdmin ? (
                    <>
                      <Select
                        value={selectedStates[truck.id] || truck.state}
                        onValueChange={(value) => handleStateChange(truck.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Activo">Activo</SelectItem>
                          <SelectItem value="Inactivo">Inactivo</SelectItem>
                          <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="Transito">Tránsito</SelectItem>
                          <SelectItem value="Descarga">Descarga</SelectItem>
                          <SelectItem value="Asignado">Asignado</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/trucks/${truck.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/trucks/${truck.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {trucks.length === 0 && <div className="text-center py-8 text-gray-500">No hay camiones registrados</div>}
    </div>
  )
}
