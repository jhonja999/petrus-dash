"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useFormStore } from "@/hooks/useFormStore"
import { useTruckFormStore, truckValidationRules, type TruckFormData } from "@/stores/truckFormStore"
import { Loader2, Save, RotateCcw, AlertCircle, Info } from "lucide-react"
import type { Truck, FuelType, TruckState } from "@/types/globals"

interface TruckEditFormProps {
  truck: Truck
}

const FUEL_TYPES: { value: FuelType; label: string }[] = [
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

const TRUCK_STATES: { value: TruckState; label: string; color: string }[] = [
  { value: "Activo", label: "Activo", color: "bg-green-100 text-green-800" },
  { value: "Inactivo", label: "Inactivo", color: "bg-gray-100 text-gray-800" },
  { value: "Mantenimiento", label: "Mantenimiento", color: "bg-yellow-100 text-yellow-800" },
  { value: "Transito", label: "En Tránsito", color: "bg-blue-100 text-blue-800" },
  { value: "Descarga", label: "En Descarga", color: "bg-purple-100 text-purple-800" },
  { value: "Asignado", label: "Asignado", color: "bg-orange-100 text-orange-800" },
]

// Helper function to safely convert Decimal to number
const decimalToNumber = (decimal: any): number => {
  if (decimal === null || decimal === undefined) return 0
  if (typeof decimal === 'number') return decimal
  if (typeof decimal === 'string') return parseFloat(decimal) || 0
  // Handle Prisma Decimal type
  if (decimal && typeof decimal.toNumber === 'function') {
    return decimal.toNumber()
  }
  // Handle Decimal.js objects
  if (decimal && typeof decimal.toString === 'function') {
    return parseFloat(decimal.toString()) || 0
  }
  return 0
}

// Helper function to safely get string value
const safeStringValue = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

// Helper function to safely get number value
const safeNumberValue = (value: any, defaultValue: number = new Date().getFullYear()): number => {
  if (value === null || value === undefined) return defaultValue
  if (typeof value === 'number') return value
  const parsed = parseInt(String(value), 10)
  return isNaN(parsed) ? defaultValue : parsed
}

export function TruckEditForm({ truck }: TruckEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  // Usar el store unificado
  const truckStore = useTruckFormStore()
  const {
    formData,
    errors,
    isSubmitting,
    isDirty,
    handleSubmit,
    getFieldProps,
    getSelectProps,
    setFormData,
    setOriginalData,
    resetForm
  } = useFormStore(truckStore, truckValidationRules)

  // Inicializar datos del formulario
  useEffect(() => {
    const initialData: TruckFormData = {
      id: truck.id.toString(),
      licensePlate: truck.placa,
      capacity: decimalToNumber(truck.capacitygal), // Convert Decimal to number
      model: safeStringValue((truck as any).model), // Safe access to optional property
      year: safeNumberValue((truck as any).year), // Safe access to optional property
      status: truck.state === 'Activo' ? 'ACTIVE' : 
              truck.state === 'Inactivo' ? 'INACTIVE' : 'MAINTENANCE',
      fuelType: truck.typefuel,
      notes: safeStringValue((truck as any).notes) // Safe access to optional property
    }
    
    setFormData(initialData)
    setOriginalData(initialData)
  }, [truck, setFormData, setOriginalData])

  const onSubmit = async (data: TruckFormData) => {
    try {
      const response = await fetch(`/api/trucks/${truck.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placa: data.licensePlate.trim().toUpperCase(),
          typefuel: data.fuelType,
          capacitygal: data.capacity,
          model: data.model,
          year: data.year,
          state: data.status === 'ACTIVE' ? 'Activo' : 
                 data.status === 'INACTIVE' ? 'Inactivo' : 'Mantenimiento',
          notes: data.notes,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Error al actualizar el camión")
      }

      toast({
        title: "¡Éxito!",
        description: `Camión ${responseData.placa} actualizado correctamente`,
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/trucks")
      }, 2000)
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Error al actualizar el camión",
        variant: "destructive",
      })
      throw err
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            Editar Camión - {truck.placa}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Información actual */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Camión actual:</strong> {truck.placa} | 
                <strong>Combustible:</strong> {truck.typefuel} | 
                <strong>Capacidad:</strong> {decimalToNumber(truck.capacitygal)} galones | 
                <strong>Estado:</strong> {truck.state}
              </AlertDescription>
            </Alert>

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
                    {FUEL_TYPES.map((option) => (
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
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    <SelectItem value="MAINTENANCE">Mantenimiento</SelectItem>
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

            <Separator />

            {/* Botones */}
            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting || !isDirty} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cambios
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting || !isDirty}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Restaurar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/trucks")}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </div>

            {/* Indicador de cambios */}
            {isDirty && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicar las modificaciones.
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}