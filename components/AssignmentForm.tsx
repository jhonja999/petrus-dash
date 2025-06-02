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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await axios.post("/api/assignments", {
        truckId: Number.parseInt(formData.truckId),
        driverId: Number.parseInt(formData.driverId),
        totalLoaded: totalLoaded,
        fuelType: formData.fuelType,
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

      onSuccess?.()
    } catch (error) {
      console.error("Error creating assignment:", error)
      alert("Error al crear la asignación")
    } finally {
      setLoading(false)
    }
  }

  const availableTrucks = trucks.filter((truck) => truck.state === "Activo")
  // Corrected role comparison: "Operador" instead of "conductor"
  const availableDrivers = drivers.filter((driver) => driver.role === "Operador" && driver.state === "Activo")

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
              <Label htmlFor="truck">Camión</Label>
              <Select
                value={formData.truckId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, truckId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar camión" />
                </SelectTrigger>
                <SelectContent>
                  {availableTrucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id.toString()}>
                      {truck.placa} - {fuelTypeLabels[truck.typefuel]} (Cap: {truck.capacitygal.toString()})
                      {Number(truck.lastRemaining) > 0 && (
                        <span className="text-blue-600 ml-2">(Remanente: {truck.lastRemaining.toString()})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver">Conductor</Label>
              <Select
                value={formData.driverId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, driverId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id.toString()}>
                      {driver.name} {driver.lastname} - {driver.dni}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="totalLoaded">Combustible a Cargar (Galones)</Label>
              <Input
                id="totalLoaded"
                type="number"
                step="0.01"
                value={formData.totalLoaded}
                onChange={(e) => setFormData((prev) => ({ ...prev, totalLoaded: e.target.value }))}
                placeholder="0.00"
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
              <Select
                value={formData.fuelType}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, fuelType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar combustible" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIESEL_B5">Diésel B5</SelectItem>
                  <SelectItem value="GASOLINA_90">Gasolina 90</SelectItem>
                  <SelectItem value="GASOLINA_95">Gasolina 95</SelectItem>
                  <SelectItem value="GLP">GLP</SelectItem>
                  <SelectItem value="ELECTRICA">Eléctrica</SelectItem>
                </SelectContent>
              </Select>
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

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !formData.truckId || !formData.driverId || !formData.totalLoaded || !formData.fuelType}
          >
            {loading ? "Creando Asignación..." : "Crear Asignación"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
