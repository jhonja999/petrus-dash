"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import axios from "axios"
import type { Truck, User } from "@/types/globals"
import { toast } from "sonner"

interface AssignmentFormProps {
  trucks: Truck[]
  drivers: User[]
  onSuccess?: () => void
}

const fuelTypeLabels = {
  DIESEL_B5: "Diésel B5",
  GASOLINA_90: "Gasolina 90",
  GASOLINA_95: "Gasolina 95",
  GLP: "GLP",
  ELECTRICA: "Eléctrica",
}

export function AssignmentForm({ trucks, drivers, onSuccess }: AssignmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    truckId: "",
    driverId: "",
    totalLoaded: "",
    fuelType: "",
    notes: "",
  })

  const selectedTruck = trucks.find((t) => t.id === Number.parseInt(formData.truckId))
  const previousRemaining = selectedTruck?.lastRemaining || 0
  const totalLoaded = Number.parseFloat(formData.totalLoaded) || 0
  const totalAvailable = Number(previousRemaining) + totalLoaded

  // ✅ FIX: Update fuelType when truck is selected
  const handleTruckChange = (value: string) => {
    const truck = trucks.find((t) => t.id === Number.parseInt(value))
    setFormData((prev) => ({ 
      ...prev, 
      truckId: value,
      fuelType: truck?.typefuel || "" // ✅ Set fuelType automatically
    }))
    
    if (truck) {
      toast.success("Camión seleccionado", {
        description: `${truck.placa} - ${fuelTypeLabels[truck.typefuel]}${Number(truck.lastRemaining) > 0 ? ` (Remanente: ${truck.lastRemaining})` : ""}`,
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      toast.info("⏳ Creando asignación...", {
        description: "Procesando la asignación diaria.",
      })

      await axios.post("/api/assignments", {
        truckId: Number.parseInt(formData.truckId),
        driverId: Number.parseInt(formData.driverId),
        totalLoaded: totalLoaded,
        fuelType: selectedTruck?.typefuel || formData.fuelType,
        notes: formData.notes || undefined,
      })

      // Reset form
      setFormData({
        truckId: "",
        driverId: "",
        totalLoaded: "",
        fuelType: "",
        notes: "",
      })

      const driverName = drivers.find(d => d.id === Number.parseInt(formData.driverId))
      const driverDisplayName = driverName ? `${driverName.name} ${driverName.lastname}` : "conductor"

      toast.success("✅ ¡Asignación creada!", {
        description: `${selectedTruck?.placa} asignado a ${driverDisplayName} con ${totalLoaded} galones.`,
      })

      onSuccess?.()
    } catch (error: any) {
      console.error("Error creating assignment:", error)
      
      let errorMessage = "Error al crear la asignación"
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          errorMessage = error.response.data?.error || "Datos de asignación inválidos"
        } else if (error.response?.status === 404) {
          errorMessage = "Camión o conductor no encontrado"
        } else if (error.response?.status === 403) {
          errorMessage = "No tienes permisos para crear asignaciones"
        } else if (error.response?.status === 401) {
          errorMessage = "Sesión expirada. Inicia sesión nuevamente"
        }
      }
      
      toast.error("❌ Error al crear asignación", {
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const availableTrucks = trucks.filter((truck) => truck.state === "Activo")
  const availableDrivers = drivers.filter((driver) => driver.role === "Operador" && driver.state === "Activo")

  // ✅ FIX: Check if form is valid using selectedTruck instead of formData.fuelType
  const isFormValid = !loading && 
                     formData.truckId && 
                     formData.driverId && 
                     formData.totalLoaded && 
                     Number.parseFloat(formData.totalLoaded) > 0 &&
                     selectedTruck?.typefuel // ✅ Use selectedTruck for validation

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Asignación Diaria</CardTitle>
        <CardDescription>Asignar camión y combustible a un conductor para el día de hoy</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="truck">Camión *</Label>
              <Select
                value={formData.truckId}
                onValueChange={handleTruckChange} // ✅ Use new handler
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar camión" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrucks.length > 0 ? (
                    availableTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()}>
                        {truck.placa} - {fuelTypeLabels[truck.typefuel]} (Cap: {truck.capacitygal.toString()})
                        {Number(truck.lastRemaining) > 0 && (
                          <span className="text-blue-600 ml-2">(Remanente: {truck.lastRemaining.toString()})</span>
                        )}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-trucks" disabled>
                      No hay camiones disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {availableTrucks.length === 0 && (
                <p className="text-sm text-red-600">⚠️ No hay camiones activos disponibles</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver">Conductor *</Label>
              <Select
                value={formData.driverId}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, driverId: value }))
                  const driver = drivers.find(d => d.id === Number.parseInt(value))
                  if (driver) {
                    toast.success("Conductor seleccionado", {
                      description: `${driver.name} ${driver.lastname} - DNI: ${driver.dni}`,
                    })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.length > 0 ? (
                    availableDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name} {driver.lastname} - {driver.dni}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-drivers" disabled>
                      No hay conductores disponibles
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {availableDrivers.length === 0 && (
                <p className="text-sm text-red-600">⚠️ No hay conductores activos disponibles</p>
              )}
            </div>
          </div>

          {selectedTruck && Number(previousRemaining) > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Este camión tiene <strong>{previousRemaining.toString()} galones</strong> remanentes del día anterior.
                Se sumarán automáticamente a la nueva carga.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalLoaded">Combustible a Cargar (Galones) *</Label>
              <Input
                id="totalLoaded"
                type="number"
                step="0.01"
                max="3000"
                value={formData.totalLoaded}
                onChange={(e) => {
                  const value = Number.parseFloat(e.target.value) || 0
                  if (value <= 3000) {
                    setFormData((prev) => ({ ...prev, totalLoaded: e.target.value }))
                  } else {
                    toast.warning("⚠️ Límite excedido", {
                      description: "El máximo permitido es 3000 galones.",
                    })
                  }
                }}
                placeholder="0.00 (Máximo: 3000)"
                required
              />
              {selectedTruck && totalLoaded > 0 && (
                <p className="text-sm text-green-600">
                  Total disponible: <strong>{totalAvailable.toFixed(2)} galones</strong>
                  {Number(previousRemaining) > 0 && (
                    <span className="text-blue-600"> (Incluye {previousRemaining.toString()} de remanente)</span>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelType">Tipo de Combustible</Label>
              <Input
                value={selectedTruck ? fuelTypeLabels[selectedTruck.typefuel] : ""}
                disabled
                placeholder="Seleccione un camión primero"
                className="bg-gray-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Instrucciones especiales, rutas, etc."
              rows={3}
            />
          </div>

          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              <p>Debug: truckId={formData.truckId}, driverId={formData.driverId}, totalLoaded={formData.totalLoaded}, fuelType={formData.fuelType || selectedTruck?.typefuel}</p>
              <p>Form valid: {isFormValid ? "✅" : "❌"}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={!isFormValid} // ✅ Use new validation
          >
            {loading ? "⏳ Creando Asignación..." : "Crear Asignación"}
          </Button>

          {!isFormValid && !loading && (
            <div className="text-sm text-gray-600 space-y-1">
              <p>Complete todos los campos requeridos (*):</p>
              <ul className="list-disc list-inside space-y-1">
                {!formData.truckId && <li>Seleccionar camión</li>}
                {!formData.driverId && <li>Seleccionar conductor</li>}
                {!formData.totalLoaded && <li>Ingresar cantidad de combustible</li>}
                {formData.totalLoaded && Number.parseFloat(formData.totalLoaded) <= 0 && <li>Cantidad debe ser mayor a 0</li>}
              </ul>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}