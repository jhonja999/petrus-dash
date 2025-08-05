import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export interface AssignmentCardProps {
  id: number | string;
  title: string;
  description?: string;
  status: string;
  operatorName?: string;
  truckId?: string | number;
  truckName?: string;
  fuelType?: string;
  customFuelType?: string;
  evidenceCount?: number;
  createdAt?: string;
  role: "admin" | "operator";
  onComplete?: () => void;
  onView?: () => void;
  onEdit?: () => void;
}

export const AssignmentCard: React.FC<AssignmentCardProps> = ({
  id,
  title,
  description,
  status,
  operatorName,
  truckId,
  truckName,
  fuelType,
  customFuelType,
  evidenceCount,
  createdAt,
  role,
  onComplete,
  onView,
  onEdit,
}) => {
  // Determine which fuel type to display
  const effectiveFuelType = customFuelType?.trim()
    ? customFuelType
    : fuelType;
  const fuelLabel = customFuelType?.trim()
    ? `Personalizado: ${customFuelType}`
    : fuelType;

  return (
    <div className="border rounded-lg shadow-sm p-4 bg-white flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg">{title}</h2>
        <Badge className={
          status === "Completado"
            ? "bg-green-100 text-green-800"
            : "bg-yellow-100 text-yellow-800"
        }>
          {status}
        </Badge>
      </div>
      {description && <p className="text-gray-600 text-sm">{description}</p>}
      <div className="flex flex-wrap gap-4 text-sm">
        {truckName && (
          <span>
            <strong>Camión:</strong> {truckName}
          </span>
        )}
        {operatorName && (
          <span>
            <strong>Operador:</strong> {operatorName}
          </span>
        )}
        {fuelLabel && (
          <span>
            <strong>Combustible:</strong> {fuelLabel}
          </span>
        )}
        {evidenceCount !== undefined && (
          <span>
            <strong>Evidencias:</strong> {evidenceCount}
          </span>
        )}
        {createdAt && (
          <span>
            <strong>Creado:</strong> {new Date(createdAt).toLocaleString()}
          </span>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        {role === "operator" && status !== "Completado" && onComplete && (
          <Button size="sm" onClick={onComplete}>
            Completar Asignación
          </Button>
        )}
        {role === "admin" && onEdit && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            Editar
          </Button>
        )}
        {onView && (
          <Button size="sm" variant="ghost" onClick={onView}>
            Ver Detalles
          </Button>
        )}
        {role === "admin" && (
          <Link href={`/admin/assignments/${id}`}>
            <Button size="sm" variant="outline">
              Panel Admin
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};
