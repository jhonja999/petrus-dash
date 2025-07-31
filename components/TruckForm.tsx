"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Truck, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFormStore } from "@/hooks/useFormStore"
import { useTruckFormStore, truckValidationRules, type TruckFormData } from "@/stores/truckFormStore"
import type { FuelType, TruckState } from "@/types/globals"

const fuelTypeOptions = [
  { value: "DIESEL_B5", label: "Diésel B5" },
  { value: "DIESEL_B500", label: "Diésel B500" },
  { value: "GASOLINA_PREMIUM_95", label: "Gasolina Premium 95" },
  { value: "GASOLINA_REGULAR_90", label: "Gasolina Regular 90" },
  { value: "GASOHOL_84", label: "Gasohol 84" },
  { value: "GASOHOL_90", label: "Gasohol 90" },
  { value: "GASOHOL_95", label: "Gasohol 95" },
  { value: "SOLVENTE", label: "Solvente" },
  { value: "GASOL", label: "Gasol" },
  { value: "PERSONALIZADO", label: "Personalizado" },
]

const stateOptions = [
  { value: "ACTIVE", label: "Activo" },
  { value: "INACTIVE", label: "Inactivo" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
]

export function TruckForm() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Usar el store unificado
  const truckStore = useTruckFormStore()
  const {
    formData,
    errors,
    isSubmitting,
    handleSubmit,
    getFieldProps,
    getSelectProps,
    resetForm
  } = useFormStore(truckStore, truckValidationRules)

  const onSubmit = async (data: TruckFormData) => {
    try {
      const response = await fetch("/api/trucks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          licensePlate: data.licensePlate.trim().toUpperCase(),
          fuelType: data.fuelType,
          capacity: data.capacity,
          model: data.model,
          year: data.year,
          status: data.status,
          notes: data.notes,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Error al crear el camión")
      }

      toast({
        title: "¡Éxito!",
        description: `Camión ${responseData.licensePlate} creado correctamente`,
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/trucks")
      }, 2000)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Error al crear el camión",
        variant: "destructive",
      })
      throw err // Re-throw para que el hook maneje el estado de loading
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Placa */}
        <div className="space-y-2">
          <Label htmlFor="licensePlate">
            Placa <span className="text-red-500">*</span>
          </Label>
          <Input
            id="licensePlate"
            type="text"
            placeholder="Ej: ABC123"
            {...getFieldProps('licensePlate')}
            className={errors.licensePlate ? "border-red-500" : ""}
          />
          {errors.licensePlate && (
            <p className="text-sm text-red-500">{errors.licensePlate}</p>
          )}
        </div>

        {/* Capacidad */}
        <div className="space-y-2">
          <Label htmlFor="capacity">
            Capacidad (galones) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="capacity"
            type="number"
            placeholder="Ej: 5000"
            {...getFieldProps('capacity')}
            className={errors.capacity ? "border-red-500" : ""}
          />
          {errors.capacity && (
            <p className="text-sm text-red-500">{errors.capacity}</p>
          )}
        </div>

        {/* Modelo */}
        <div className="space-y-2">
          <Label htmlFor="model">
            Modelo <span className="text-red-500">*</span>
          </Label>
          <Input
            id="model"
            type="text"
            placeholder="Ej: Volvo FH16"
            {...getFieldProps('model')}
            className={errors.model ? "border-red-500" : ""}
          />
          {errors.model && (
            <p className="text-sm text-red-500">{errors.model}</p>
          )}
        </div>

        {/* Año */}
        <div className="space-y-2">
          <Label htmlFor="year">
            Año <span className="text-red-500">*</span>
          </Label>
          <Input
            id="year"
            type="number"
            placeholder="Ej: 2023"
            {...getFieldProps('year')}
            className={errors.year ? "border-red-500" : ""}
          />
          {errors.year && (
            <p className="text-sm text-red-500">{errors.year}</p>
          )}
        </div>

        {/* Tipo de Combustible */}
        <div className="space-y-2">
          <Label htmlFor="fuelType">
            Tipo de Combustible <span className="text-red-500">*</span>
          </Label>
          <Select {...getSelectProps('fuelType')}>
            <SelectTrigger className={errors.fuelType ? "border-red-500" : ""}>
              <SelectValue placeholder="Seleccionar tipo de combustible" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.fuelType && (
            <p className="text-sm text-red-500">{errors.fuelType}</p>
          )}
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="status">
            Estado <span className="text-red-500">*</span>
          </Label>
          <Select {...getSelectProps('status')}>
            <SelectTrigger className={errors.status ? "border-red-500" : ""}>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-500">{errors.status}</p>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Input
            id="notes"
            type="text"
            placeholder="Notas adicionales (opcional)"
            {...getFieldProps('notes')}
            className={errors.notes ? "border-red-500" : ""}
          />
          {errors.notes && (
            <p className="text-sm text-red-500">{errors.notes}</p>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando camión...
            </>
          ) : (
            <>
              <Truck className="mr-2 h-4 w-4" />
              Crear Camión
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={resetForm}
          disabled={isSubmitting}
        >
          Limpiar
        </Button>
      </div>
    </form>
  )
}
