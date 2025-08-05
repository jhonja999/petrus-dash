"use client"

import type { StoreTruck } from "@/stores/truckManagementStore";
import type { TruckState } from "@/types/globals";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Eye, Truck as TruckIcon, User as UserIcon, ClipboardList } from "lucide-react"
import { useTruckManagementStore } from '@/stores/truckManagementStore';
import { useState } from 'react';
import Link from "next/link"

interface TruckTableProps {
  trucks: StoreTruck[];
  onUpdateState?: (truckId: number, newState: TruckState) => void | Promise<void>;
  onRefreshTrucks?: () => void;
  isAdmin?: boolean;
}

const stateColors = {
  Activo: "bg-green-100 text-green-800",
  Inactivo: "bg-gray-100 text-gray-800",
  Mantenimiento: "bg-yellow-100 text-yellow-800",
  Transito: "bg-blue-100 text-blue-800",
  Descarga: "bg-purple-100 text-purple-800",
  Asignado: "bg-orange-100 text-orange-800",
};

const fuelTypeLabels = {
  DIESEL_B5: "Diésel B5",
  GASOLINA_90: "Gasolina 90",
  GASOLINA_95: "Gasolina 95",
  GLP: "GLP",
  ELECTRICA: "Eléctrica",
};

function TruckTable({ trucks, onUpdateState, isAdmin }: TruckTableProps) {
  const { truckStates } = useTruckManagementStore();
  const [selectedStates, setSelectedStates] = useState<Record<number, TruckState>>({});
  const [modalTruck, setModalTruck] = useState<StoreTruck | null>(null);

  const handleStateChange = (truckId: number, newState: TruckState) => {
    setSelectedStates((prev: Record<number, TruckState>) => ({ ...prev, [truckId]: newState }));
    if (onUpdateState) onUpdateState(truckId, newState);
  };

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
          {trucks.map((truck: StoreTruck) => (
            <TableRow key={truck.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">{truck.placa}</TableCell>
              <TableCell>{fuelTypeLabels[String(truck.typefuel) as keyof typeof fuelTypeLabels]}</TableCell>
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
                        onValueChange={(value) => handleStateChange(truck.id, value as TruckState)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={"Activo" as TruckState}>Activo</SelectItem>
                          <SelectItem value={"Inactivo" as TruckState}>Inactivo</SelectItem>
                          <SelectItem value={"Mantenimiento" as TruckState}>Mantenimiento</SelectItem>
                          <SelectItem value={"Transito" as TruckState}>Transito</SelectItem>
                          <SelectItem value={"Descarga" as TruckState}>Descarga</SelectItem>
                          <SelectItem value={"Asignado" as TruckState}>Asignado</SelectItem>
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
                  <Button
                    size="sm"
                    variant="secondary"
                    title="Ver despacho"
                    onClick={() => setModalTruck(truck)}
                  >
                    <ClipboardList className="h-4 w-4 mr-1" />
                    Despacho
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {trucks.length === 0 && <div className="text-center py-8 text-gray-500">No hay camiones registrados</div>}

      {/* Modal de despacho */}
      {modalTruck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setModalTruck(null)}
              aria-label="Cerrar"
            >
              &times;
            </button>
            <div className="flex items-center gap-2 mb-4">
              <TruckIcon className="h-5 w-5 text-blue-600" />
              <span className="font-bold text-lg">Despacho de Camión</span>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Placa:</span> {modalTruck.placa}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Estado:</span> {modalTruck.state}
            </div>
            <div className="mb-2">
              <span className="font-semibold">Tipo de combustible:</span> {fuelTypeLabels[String(modalTruck.typefuel) as keyof typeof fuelTypeLabels]}
            </div>
            {/* Aquí podrías mostrar más detalles del despacho, como usuario asignado, última actividad, etc. */}
            <div className="mb-2 flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-gray-600" />
              <span className="font-semibold">Usuario asignado:</span>
              <span>{/* Aquí podrías mostrar el nombre del usuario si tienes ese dato */}N/A</span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/despacho/${modalTruck.id}`}>Ir al despacho</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setModalTruck(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TruckTable;
