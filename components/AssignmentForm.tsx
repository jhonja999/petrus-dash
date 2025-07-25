"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Truck, User, AlertCircle, Plus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import type { FuelType } from "@/types/globals"

interface Driver {
  id: number
  name: string
  lastname: string
  dni: string
  email: string
  state: string
}

interface TruckData {
  id: number
  placa: string
  typefuel: FuelType
  capacitygal: number
  lastRemaining: number
  state: string
}

interface AssignmentFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

// Properly typed fuel type labels
const fuelTypeLabels: Record<FuelType, string> = {
  DIESEL_B5: "Diésel B5",
  DIESEL_B500: "Diésel B500",
  GASOLINA_PREMIUM_95: "Gasolina Premium 95",
  GASOLINA_REGULAR_90: "Gasolina Regular 90",
  GASOHOL_84: "Gasohol 84",
  GASOHOL_90: "Gasohol 90",
  GASOHOL_95: "Gasohol 95",
  SOLVENTE: "Solvente",
  GASOL: "Gasol",
  PERSONALIZADO: "Personalizado",
}

// Helper function to safely get fuel type label
const getFuelTypeLabel = (fuelType: FuelType): string => {
  return fuelTypeLabels[fuelType] || fuelType
}

export function AssignmentForm({ onSuccess, onCancel }: AssignmentFormProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [trucks, setTrucks] = useState<TruckData[]>([])
  const [availableTrucks, setAvailableTrucks] = useState<TruckData[]>([])
  const [selectedTruck, setSelectedTruck] = useState<TruckData | null>(null)

  const [formData, setFormData] = useState({
    truckId: "",
    driverId: "",
    totalLoaded: "",
    fuelType: "" as FuelType | "",
    notes: "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchDrivers()
    fetchTrucks()
  }, [])

  useEffect(() => {
    if (formData.fuelType) {
      const filtered = trucks.filter((truck) => truck.typefuel === formData.fuelType && truck.state === "Activo")
      setAvailableTrucks(filtered)

      // Reset truck selection if current truck doesn't match fuel type
      if (selectedTruck && selectedTruck.typefuel !== formData.fuelType) {
        setSelectedTruck(null)
        setFormData((prev) => ({ ...prev, truckId: "" }))
      }
    } else {
      setAvailableTrucks([])
    }
  }, [formData.fuelType, trucks])

  useEffect(() => {
    if (formData.truckId) {
      const truck = trucks.find((t) => t.id === Number(formData.truckId))
      setSelectedTruck(truck || null)
    } else {
      setSelectedTruck(null)
    }
  }, [formData.truckId, trucks])

  const fetchDrivers = async () => {
    try {
      const response = await axios.get("/api/users?role=Operador&state=Activo")
      setDrivers(response.data)
    } catch (error) {
      console.error("Error fetching drivers:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los conductores",
        variant: "destructive",
      })
    }
  }

  const fetchTrucks = async () => {
    try {
      const response = await axios.get("/api/trucks")
      setTrucks(response.data)
    } catch (error) {
      console.error("Error fetching trucks:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los camiones",
        variant: "destructive",
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.truckId) newErrors.truckId = "Selecciona un camión"
    if (!formData.driverId) newErrors.driverId = "Selecciona un conductor"
    if (!formData.totalLoaded) newErrors.totalLoaded = "Ingresa la cantidad cargada"
    if (!formData.fuelType) newErrors.fuelType = "Selecciona el tipo de combustible"

    const totalLoaded = Number.parseFloat(formData.totalLoaded)
    if (totalLoaded <= 0) {
      newErrors.totalLoaded = "La cantidad debe ser mayor a 0"
    }

    if (selectedTruck && totalLoaded > selectedTruck.capacitygal) {
      newErrors.totalLoaded = `La cantidad no puede exceder la capacidad del camión (${selectedTruck.capacitygal} gal)`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      const payload = {
        truckId: Number(formData.truckId),
        driverId: Number(formData.driverId),
        totalLoaded: Number.parseFloat(formData.totalLoaded),
        fuelType: formData.fuelType,
        notes: formData.notes || null,
      }

      await axios.post("/api/assignments", payload)

      toast({
        title: "Asignación creada",
        description: "La asignación se ha creado exitosamente",
      })

      // Reset form
      setFormData({
        truckId: "",
        driverId: "",
        totalLoaded: "",
        fuelType: "" as FuelType | "",
        notes: "",
      })
      setErrors({})
      setSelectedTruck(null)

      onSuccess?.()
    } catch (error: any) {
      console.error("Error creating assignment:", error)

      let errorMessage = "Error al crear la asignación"
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const selectedDriver = drivers.find((d) => d.id === Number(formData.driverId))

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          Nueva Asignación
        </CardTitle>
        <CardDescription>Asigna un camión y conductor para una nueva carga de combustible</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fuel Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="fuelType">Tipo de Combustible *</Label>
            <Select value={formData.fuelType} onValueChange={(value: FuelType) => handleInputChange("fuelType", value)}>
              <SelectTrigger className={errors.fuelType ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecciona el tipo de combustible" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(fuelTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fuelType && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.fuelType}
              </p>
            )}
          </div>

          {/* Truck Selection */}
          <div className="space-y-2">
            <Label htmlFor="truckId">Camión *</Label>
            <Select
              value={formData.truckId}
              onValueChange={(value) => handleInputChange("truckId", value)}
              disabled={!formData.fuelType}
            >
              <SelectTrigger className={errors.truckId ? "border-red-500" : ""}>
                <SelectValue
                  placeholder={
                    !formData.fuelType
                      ? "Primero selecciona el tipo de combustible"
                      : availableTrucks.length === 0
                        ? "No hay camiones disponibles para este combustible"
                        : "Selecciona un camión"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableTrucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{truck.placa}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          {getFuelTypeLabel(truck.typefuel)}
                        </Badge>
                        <span className="text-xs text-gray-500">{truck.capacitygal} gal</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.truckId && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.truckId}
              </p>
            )}
          </div>

          {/* Truck Details */}
          {selectedTruck && (
            <Alert>
              <Truck className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>Camión seleccionado:</strong> {selectedTruck.placa}
                  </p>
                  <p>
                    <strong>Capacidad:</strong> {selectedTruck.capacitygal} galones
                  </p>
                  <p>
                    <strong>Combustible restante:</strong> {selectedTruck.lastRemaining} galones
                  </p>
                  <p>
                    <strong>Tipo de combustible:</strong> {getFuelTypeLabel(selectedTruck.typefuel)}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Driver Selection */}
          <div className="space-y-2">
            <Label htmlFor="driverId">Conductor *</Label>
            <Select value={formData.driverId} onValueChange={(value) => handleInputChange("driverId", value)}>
              <SelectTrigger className={errors.driverId ? "border-red-500" : ""}>
                <SelectValue placeholder="Selecciona un conductor" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">
                        {driver.name} {driver.lastname}
                      </span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant="outline" className="text-xs">
                          DNI: {driver.dni}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            driver.state === "Activo" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {driver.state}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.driverId && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.driverId}
              </p>
            )}
          </div>

          {/* Driver Details */}
          {selectedDriver && (
            <Alert>
              <User className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>Conductor seleccionado:</strong> {selectedDriver.name} {selectedDriver.lastname}
                  </p>
                  <p>
                    <strong>DNI:</strong> {selectedDriver.dni}
                  </p>
                  <p>
                    <strong>Email:</strong> {selectedDriver.email}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Total Loaded */}
          <div className="space-y-2">
            <Label htmlFor="totalLoaded">Cantidad Cargada (Galones) *</Label>
            <Input
              id="totalLoaded"
              type="number"
              step="0.01"
              min="0"
              max={selectedTruck?.capacitygal || undefined}
              value={formData.totalLoaded}
              onChange={(e) => handleInputChange("totalLoaded", e.target.value)}
              placeholder="Ej: 2500.00"
              className={errors.totalLoaded ? "border-red-500" : ""}
            />
            {selectedTruck && (
              <p className="text-xs text-gray-500">Capacidad máxima: {selectedTruck.capacitygal} galones</p>
            )}
            {errors.totalLoaded && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.totalLoaded}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Instrucciones especiales, destino, observaciones..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 bg-transparent"
                disabled={loading}
              >
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Asignación
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
