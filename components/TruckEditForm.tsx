"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Loader2, Save, RotateCcw, AlertCircle, Info } from "lucide-react"
import type { Truck, FuelType, TruckState } from "@/types/globals"

interface TruckEditFormProps {
  truck: Truck
}

interface TruckFormData {
  placa: string
  typefuel: FuelType | ""
  capacitygal: string
  lastRemaining: string
  state: TruckState
}

interface TruckFormErrors {
  placa?: string
  typefuel?: string
  capacitygal?: string
  lastRemaining?: string
  state?: string
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

export function TruckEditForm({ truck }: TruckEditFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState<TruckFormData>({
    placa: truck.placa,
    typefuel: truck.typefuel,
    capacitygal: truck.capacitygal.toString(),
    lastRemaining: truck.lastRemaining.toString(),
    state: truck.state,
  })

  const [originalData, setOriginalData] = useState<TruckFormData>({
    placa: truck.placa,
    typefuel: truck.typefuel,
    capacitygal: truck.capacitygal.toString(),
    lastRemaining: truck.lastRemaining.toString(),
    state: truck.state,
  })

  const [errors, setErrors] = useState<TruckFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Detectar cambios
  useEffect(() => {
    const changed = Object.keys(formData).some(
      (key) => formData[key as keyof TruckFormData] !== originalData[key as keyof TruckFormData],
    )
    setHasChanges(changed)
  }, [formData, originalData])

  const validateForm = (): boolean => {
    const newErrors: TruckFormErrors = {}

    // Validar placa
    if (!formData.placa.trim()) {
      newErrors.placa = "La placa es requerida"
    } else if (formData.placa.trim().length < 6) {
      newErrors.placa = "La placa debe tener al menos 6 caracteres"
    }

    // Validar tipo de combustible
    if (!formData.typefuel) {
      newErrors.typefuel = "El tipo de combustible es requerido"
    }

    // Validar capacidad
    const capacity = Number.parseFloat(formData.capacitygal)
    if (!formData.capacitygal || isNaN(capacity)) {
      newErrors.capacitygal = "La capacidad es requerida y debe ser un número"
    } else if (capacity <= 0) {
      newErrors.capacitygal = "La capacidad debe ser mayor a 0"
    } else if (capacity > 15000) {
      newErrors.capacitygal = "La capacidad máxima es de 15,000 galones"
    }

    // Validar remanente
    const remaining = Number.parseFloat(formData.lastRemaining)
    if (formData.lastRemaining && !isNaN(remaining)) {
      if (remaining < 0) {
        newErrors.lastRemaining = "El remanente no puede ser negativo"
      } else if (!isNaN(capacity) && remaining > capacity) {
        newErrors.lastRemaining = "El remanente no puede ser mayor a la capacidad"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof TruckFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSelectChange = (field: keyof TruckFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleReset = () => {
    setFormData(originalData)
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/trucks/${truck.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placa: formData.placa.trim(),
          typefuel: formData.typefuel,
          capacitygal: Number.parseFloat(formData.capacitygal),
          lastRemaining: Number.parseFloat(formData.lastRemaining) || 0,
          state: formData.state,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Error al actualizar el camión")
      }

      toast({
        title: "¡Éxito!",
        description: "El camión ha sido actualizado correctamente",
      })

      // Actualizar datos originales
      setOriginalData(formData)

      // Redirigir después de un breve delay
      setTimeout(() => {
        router.push("/trucks")
      }, 1500)
    } catch (error) {
      console.error("Error updating truck:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar el camión",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentState = TRUCK_STATES.find((s) => s.value === truck.state)

  return (
    <div className="space-y-6">
      {/* Información del camión */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Información del Camión
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <Label className="text-muted-foreground">ID</Label>
            <p className="font-medium">{truck.id}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Estado Actual</Label>
            <div className="mt-1">
              <Badge className={currentState?.color}>{currentState?.label}</Badge>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Última Actualización</Label>
            <p className="font-medium">
              {truck.updatedAt ? new Date(truck.updatedAt).toLocaleDateString("es-ES") : "No disponible"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de cambios */}
      {hasChanges && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Tienes cambios sin guardar. No olvides guardar antes de salir.</AlertDescription>
        </Alert>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos del Camión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Placa */}
              <div className="space-y-2">
                <Label htmlFor="placa">
                  Placa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="placa"
                  type="text"
                  placeholder="Ej: ABC-123"
                  value={formData.placa}
                  onChange={(e) => handleInputChange("placa", e.target.value)}
                  className={errors.placa ? "border-red-500" : ""}
                />
                {errors.placa && <p className="text-sm text-red-500">{errors.placa}</p>}
              </div>

              {/* Tipo de Combustible */}
              <div className="space-y-2">
                <Label htmlFor="typefuel">
                  Tipo de Combustible <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.typefuel} onValueChange={(value) => handleSelectChange("typefuel", value)}>
                  <SelectTrigger className={errors.typefuel ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona el tipo de combustible" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel.value} value={fuel.value}>
                        {fuel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.typefuel && <p className="text-sm text-red-500">{errors.typefuel}</p>}
                <p className="text-sm text-muted-foreground">
                  Tipo predeterminado del camión. Puede ser modificado en cada asignación.
                </p>
              </div>

              {/* Capacidad */}
              <div className="space-y-2">
                <Label htmlFor="capacitygal">
                  Capacidad (Galones) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="capacitygal"
                  type="number"
                  step="0.01"
                  min="0"
                  max="15000"
                  placeholder="Ej: 1000 (Máximo: 15,000)"
                  value={formData.capacitygal}
                  onChange={(e) => handleInputChange("capacitygal", e.target.value)}
                  className={errors.capacitygal ? "border-red-500" : ""}
                />
                {errors.capacitygal && <p className="text-sm text-red-500">{errors.capacitygal}</p>}
              </div>

              {/* Remanente */}
              <div className="space-y-2">
                <Label htmlFor="lastRemaining">Remanente Actual (Galones)</Label>
                <Input
                  id="lastRemaining"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 500"
                  value={formData.lastRemaining}
                  onChange={(e) => handleInputChange("lastRemaining", e.target.value)}
                  className={errors.lastRemaining ? "border-red-500" : ""}
                />
                {errors.lastRemaining && <p className="text-sm text-red-500">{errors.lastRemaining}</p>}
                <p className="text-sm text-muted-foreground">Cantidad de combustible restante en el tanque</p>
              </div>

              {/* Estado */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="state">Estado del Camión</Label>
                <Select value={formData.state} onValueChange={(value) => handleSelectChange("state", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRUCK_STATES.map((state) => (
                      <SelectItem key={state.value} value={state.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${state.color.split(" ")[0]}`} />
                          {state.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={handleReset} disabled={!hasChanges || isSubmitting}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Restablecer
          </Button>

          <Button type="submit" disabled={!hasChanges || isSubmitting} className="min-w-[120px]">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
