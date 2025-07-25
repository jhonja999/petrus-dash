"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Truck, AlertCircle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { FuelType, TruckState } from "@/types/globals"

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
  { value: "Activo", label: "Activo" },
  { value: "Inactivo", label: "Inactivo" },
  { value: "Mantenimiento", label: "Mantenimiento" },
]

export function TruckForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState<TruckFormData>({
    placa: "",
    typefuel: "",
    capacitygal: "",
    lastRemaining: "0",
    state: "Activo",
  })

  const [errors, setErrors] = useState<TruckFormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: TruckFormErrors = {}

    if (!formData.placa.trim()) {
      newErrors.placa = "La placa es requerida"
    } else if (formData.placa.trim().length < 6) {
      newErrors.placa = "La placa debe tener al menos 6 caracteres"
    }

    if (!formData.typefuel) {
      newErrors.typefuel = "El tipo de combustible es requerido"
    }

    if (!formData.capacitygal.trim()) {
      newErrors.capacitygal = "La capacidad es requerida"
    } else {
      const capacity = Number.parseFloat(formData.capacitygal)
      if (isNaN(capacity) || capacity <= 0) {
        newErrors.capacitygal = "La capacidad debe ser un número mayor a 0"
      } else if (capacity > 15000) {
        newErrors.capacitygal = "La capacidad máxima es de 15,000 galones"
      }
    }

    if (formData.lastRemaining.trim()) {
      const remaining = Number.parseFloat(formData.lastRemaining)
      if (isNaN(remaining) || remaining < 0) {
        newErrors.lastRemaining = "El remanente debe ser un número mayor o igual a 0"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof TruckFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/trucks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          placa: formData.placa.trim().toUpperCase(),
          typefuel: formData.typefuel,
          capacitygal: Number.parseFloat(formData.capacitygal),
          lastRemaining: formData.lastRemaining ? Number.parseFloat(formData.lastRemaining) : 0,
          state: formData.state,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear el camión")
      }

      setSuccess(true)
      toast({
        title: "¡Éxito!",
        description: `Camión ${data.placa} creado correctamente`,
      })

      // Redirect after a short delay
      setTimeout(() => {
        router.push("/trucks")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Error al crear el camión")
      toast({
        title: "Error",
        description: err.message || "Error al crear el camión",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">¡Camión creado exitosamente!</h3>
            <p className="text-gray-600 mb-4">Redirigiendo a la lista de camiones...</p>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
            onChange={(e) => handleInputChange("placa", e.target.value.toUpperCase())}
            className={errors.placa ? "border-red-500" : ""}
            disabled={isLoading}
          />
          {errors.placa && <p className="text-sm text-red-500">{errors.placa}</p>}
        </div>

        {/* Tipo de Combustible */}
        <div className="space-y-2">
          <Label htmlFor="typefuel">
            Tipo de Combustible <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.typefuel}
            onValueChange={(value) => handleInputChange("typefuel", value)}
            disabled={isLoading}
          >
            <SelectTrigger className={errors.typefuel ? "border-red-500" : ""}>
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
          {errors.typefuel && <p className="text-sm text-red-500">{errors.typefuel}</p>}
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
            placeholder="(Máximo: 15,000)"
            value={formData.capacitygal}
            onChange={(e) => handleInputChange("capacitygal", e.target.value)}
            className={errors.capacitygal ? "border-red-500" : ""}
            disabled={isLoading}
          />
          {errors.capacitygal && <p className="text-sm text-red-500">{errors.capacitygal}</p>}
        </div>

        {/* Remanente Inicial */}
        <div className="space-y-2">
          <Label htmlFor="lastRemaining">Remanente Inicial (Galones)</Label>
          <Input
            id="lastRemaining"
            type="number"
            step="0.01"
            min="0"
            placeholder="Ej: 0"
            value={formData.lastRemaining}
            onChange={(e) => handleInputChange("lastRemaining", e.target.value)}
            className={errors.lastRemaining ? "border-red-500" : ""}
            disabled={isLoading}
          />
          {errors.lastRemaining && <p className="text-sm text-red-500">{errors.lastRemaining}</p>}
          <p className="text-sm text-gray-500">Cantidad de combustible actual en el tanque</p>
        </div>

        {/* Estado */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="state">Estado Inicial</Label>
          <Select
            value={formData.state}
            onValueChange={(value) => handleInputChange("state", value as TruckState)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Información Importante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• La placa debe ser única en el sistema</li>
            <li>• La capacidad se registra en galones</li>
            <li>• El remanente inicial puede ser 0 si el camión está vacío</li>
            <li>• El estado se puede cambiar posteriormente desde la lista de camiones</li>
          </ul>
        </CardContent>
      </Card>

      {/* Botones */}
      <div className="flex justify-end space-x-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={() => router.push("/trucks")} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creando...
            </>
          ) : (
            "Crear Camión"
          )}
        </Button>
      </div>
    </form>
  )
}
