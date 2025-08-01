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
import { useState } from "react"
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

// Initial form state
const initialFormState = {
  licensePlate: '',
  fuelType: 'DIESEL_B5' as FuelType,
  customFuelType: '',
  capacity: 0,
  model: '',
  year: new Date().getFullYear(),
  status: 'ACTIVE' as TruckState,
  notes: ''
}

export function TruckForm() {
  const router = useRouter()
  const { toast } = useToast()
  
  // Estado local del formulario
  const [formData, setFormData] = useState(initialFormState)
  
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form function
  const resetForm = () => {
    setFormData(initialFormState)
    setErrors({})
    setIsSubmitting(false)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'La placa es requerida'
    } else if (formData.licensePlate.length < 6) {
      newErrors.licensePlate = 'La placa debe tener al menos 6 caracteres'
    }
    
    if (!formData.model.trim()) {
      newErrors.model = 'El modelo es requerido'
    }
    
    if (formData.capacity <= 0) {
      newErrors.capacity = 'La capacidad debe ser mayor a 0'
    }
    
    if (formData.year < 1990 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'El año debe ser válido'
    }

    // Validate custom fuel type if PERSONALIZADO is selected
    if (formData.fuelType === 'PERSONALIZADO' && !formData.customFuelType.trim()) {
      newErrors.customFuelType = 'Debe especificar el tipo de combustible personalizado'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor, corrige los errores en el formulario",
        variant: "destructive",
      })
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const response = await fetch("/api/trucks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placa: formData.licensePlate.trim().toUpperCase(),
          typefuel: formData.fuelType,
          customFuelType: formData.fuelType === 'PERSONALIZADO' ? formData.customFuelType : undefined,
          capacitygal: formData.capacity,
          model: formData.model,
          year: formData.year,
          state: formData.status === 'ACTIVE' ? 'Activo' : 
                 formData.status === 'INACTIVE' ? 'Inactivo' : 'Mantenimiento',
          notes: formData.notes,
        }),
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || "Error al crear el camión")
      }

      toast({
        title: "¡Éxito!",
        description: `Camión ${responseData.placa} creado correctamente`,
      })

      // Reset form after successful submission
      resetForm()

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
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            value={formData.licensePlate}
            onChange={(e) => handleInputChange('licensePlate', e.target.value)}
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
            value={formData.capacity}
            onChange={(e) => handleInputChange('capacity', Number(e.target.value))}
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
            value={formData.model}
            onChange={(e) => handleInputChange('model', e.target.value)}
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
            value={formData.year}
            onChange={(e) => handleInputChange('year', Number(e.target.value))}
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
          <Select value={formData.fuelType} onValueChange={(value) => handleInputChange('fuelType', value)}>
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
          <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
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

        {/* Tipo de Combustible Personalizado */}
        {formData.fuelType === 'PERSONALIZADO' && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="customFuelType">
              Tipo de Combustible Personalizado <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customFuelType"
              type="text"
              placeholder="Ej: Biodiésel B20, Gas Natural Comprimido, etc."
              value={formData.customFuelType}
              onChange={(e) => handleInputChange('customFuelType', e.target.value)}
              className={errors.customFuelType ? "border-red-500" : ""}
            />
            {errors.customFuelType && (
              <p className="text-sm text-red-500">{errors.customFuelType}</p>
            )}
            <p className="text-xs text-gray-500">
              Especifique el tipo de combustible personalizado que utilizará este camión
            </p>
          </div>
        )}

        {/* Notas */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Input
            id="notes"
            type="text"
            placeholder="Notas adicionales (opcional)"
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
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
