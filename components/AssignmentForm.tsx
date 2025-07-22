"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info, RefreshCw, Users } from "lucide-react"
import axios from "axios"
import type { Truck, User } from "@/types/globals"

interface AssignmentFormProps {
  trucks: Truck[]
  drivers: User[]
  onSuccess?: () => void
  refreshing?: boolean
}

const fuelTypeLabels = {
  DIESEL_B5: "Diésel B5",
  DIESEL_B500: "Diésel B500",
  GASOLINA_PREMIUM_95: "Gasolina Premium 95",
  GASOLINA_REGULAR_90: "Gasolina Regular 90",
  GASOHOL_84: "Gasohol 84",
  GASOHOL_90: "Gasohol 90",
  GASOHOL_95: "Gasohol 95",
  SOLVENTE: "Solvente Industrial",
  GASOL: "Gasol",
  PERSONALIZADO: "Personalizado",
}

export function AssignmentForm({ trucks, drivers, onSuccess, refreshing = false }: AssignmentFormProps) {
  const [loading, setLoading] = useState(false)
  const [localTrucks, setLocalTrucks] = useState<Truck[]>(trucks)
  const [localDrivers, setLocalDrivers] = useState<User[]>(drivers)
  const [manualRefreshing, setManualRefreshing] = useState(false)
  const [driversLoading, setDriversLoading] = useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [formData, setFormData] = useState({
    truckId: "",
    driverId: "",
    totalLoaded: "",
    fuelType: "",
    notes: "",
  })

  // Update local trucks when props change
  useEffect(() => {
    setLocalTrucks(trucks)
  }, [trucks])

  // Update local drivers when props change
  useEffect(() => {
    setLocalDrivers(drivers)
    console.log(
      "🚗 AssignmentForm received drivers:",
      drivers.length,
      drivers.map((d) => ({ id: d.id, name: `${d.name} ${d.lastname}`, role: d.role, state: d.state })),
    )
  }, [drivers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const selectedTruck = localTrucks.find((t) => t.id === Number.parseInt(formData.truckId))
  const previousRemaining = selectedTruck?.lastRemaining || 0
  const totalLoaded = Number.parseFloat(formData.totalLoaded) || 0
  const totalAvailable = Number(previousRemaining) + totalLoaded

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check if selected truck is active
      if (selectedTruck && selectedTruck.state !== "Activo") {
        alert("El camión seleccionado no está en estado Activo y no puede ser asignado.")
        setLoading(false)
        return
      }

      console.log("📝 Creating assignment with data:", {
        truckId: Number.parseInt(formData.truckId),
        driverId: Number.parseInt(formData.driverId),
        totalLoaded: totalLoaded,
        fuelType: selectedTruck?.typefuel || formData.fuelType,
      })

      await axios.post("/api/assignments", {
        truckId: Number.parseInt(formData.truckId),
        driverId: Number.parseInt(formData.driverId),
        totalLoaded: totalLoaded,
        fuelType: selectedTruck?.typefuel || formData.fuelType,
        clients: [], // Add empty clients array for initial assignment
        notes: formData.notes || undefined,
      })

      // Update truck state to 'Asignado' after successful assignment creation
      if (selectedTruck) {
        await axios.put(`/api/trucks/${selectedTruck.id}`, {
          state: "Asignado",
        })
        console.log(`🚛 Truck ${selectedTruck.placa} status updated to Asignado`)

        // Update local state immediately
        setLocalTrucks((prev) =>
          prev.map((truck) => (truck.id === selectedTruck.id ? { ...truck, state: "Asignado" as any } : truck)),
        )
      }

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
      console.error("❌ Error creating assignment:", error)
      alert("Error al crear la asignación")
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshTrucks = async () => {
    if (manualRefreshing) return

    setManualRefreshing(true)
    console.log("👤 Manual truck refresh initiated")

    try {
      const response = await axios.get("/api/trucks")
      setLocalTrucks(response.data)
      console.log("✅ Trucks refreshed manually")
    } catch (error) {
      console.error("❌ Error refreshing trucks:", error)
    } finally {
      // Reset refresh state after delay
      refreshTimeoutRef.current = setTimeout(() => {
        setManualRefreshing(false)
      }, 2000)
    }
  }

  const handleRefreshDrivers = async () => {
    if (driversLoading) return

    setDriversLoading(true)
    console.log("👥 Manual drivers refresh initiated")

    try {
      const response = await axios.get("/api/users", {
        params: { role: "OPERADOR", state: "Activo" },
      })

      console.log("📋 Drivers API response:", response.data)
      setLocalDrivers(response.data)
      console.log("✅ Drivers refreshed manually:", response.data.length, "drivers found")
    } catch (error) {
      console.error("❌ Error refreshing drivers:", error)
    } finally {
      setTimeout(() => {
        setDriversLoading(false)
      }, 1000)
    }
  }

  // Filter only active trucks for assignment
  const availableTrucks = localTrucks.filter((truck) => truck.state === "Activo")

  // Filter drivers with role OPERADOR and active state
  const availableDrivers = localDrivers.filter((driver) => {
    const isOperador = driver.role === "OPERADOR"
    const isActive = driver.state === "Activo"
    console.log(
      `👤 Driver ${driver.name} ${driver.lastname}: role=${driver.role}, state=${driver.state}, isOperador=${isOperador}, isActive=${isActive}`,
    )
    return isOperador && isActive
  })

  console.log(
    "🎯 Available drivers after filtering:",
    availableDrivers.length,
    availableDrivers.map((d) => ({ id: d.id, name: `${d.name} ${d.lastname}`, role: d.role, state: d.state })),
  )

  const isRefreshDisabled = refreshing || manualRefreshing

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">Nueva Asignación Diaria</CardTitle>
            <CardDescription className="text-sm">Asignar camión y combustible a un conductor</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefreshTrucks}
            disabled={isRefreshDisabled}
            className="flex items-center gap-1 hover:bg-gray-100 transition-all duration-200 px-2 py-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshDisabled ? "animate-spin" : ""}`} />
            <span className="text-xs">{isRefreshDisabled ? "..." : "Actualizar"}</span>
          </Button>
        </div>
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
                  {availableTrucks.length === 0 ? (
                    <SelectItem value="no-trucks" disabled>
                      No hay camiones activos disponibles
                    </SelectItem>
                  ) : (
                    availableTrucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()}>
                        {truck.placa} -{" "}
                        {fuelTypeLabels[truck.typefuel as keyof typeof fuelTypeLabels] || truck.typefuel} (Cap:{" "}
                        {truck.capacitygal.toString()})
                        {Number(truck.lastRemaining) > 0 && (
                          <span className="text-blue-600 ml-2">(Remanente: {truck.lastRemaining.toString()})</span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {availableTrucks.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
                    No hay camiones activos disponibles
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshTrucks}
                    className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors bg-transparent"
                    disabled={isRefreshDisabled}
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshDisabled ? "animate-spin" : ""}`} />
                    {isRefreshDisabled ? "Actualizando..." : "Actualizar Lista"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="driver">Conductor</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRefreshDrivers}
                  disabled={driversLoading}
                  className="flex items-center gap-1 hover:bg-gray-100 transition-all duration-200 px-2 py-1 h-6"
                >
                  <Users className={`h-3 w-3 ${driversLoading ? "animate-spin" : ""}`} />
                  <span className="text-xs">{driversLoading ? "..." : "Actualizar"}</span>
                </Button>
              </div>
              <Select
                value={formData.driverId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, driverId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar conductor" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers.length === 0 ? (
                    <SelectItem value="no-drivers" disabled>
                      No hay conductores (OPERADORES) activos disponibles
                    </SelectItem>
                  ) : (
                    availableDrivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        {driver.name} {driver.lastname} - {driver.dni}
                        <span className="text-xs text-gray-500 ml-2">({driver.role})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {availableDrivers.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border">
                    No hay conductores con rol OPERADOR activos disponibles
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshDrivers}
                    className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors bg-transparent"
                    disabled={driversLoading}
                  >
                    <Users className={`h-4 w-4 ${driversLoading ? "animate-spin" : ""}`} />
                    {driversLoading ? "Actualizando..." : "Actualizar Conductores"}
                  </Button>
                </div>
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
              <Label htmlFor="totalLoaded">Combustible a Cargar (Galones)</Label>
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
                value={
                  selectedTruck
                    ? fuelTypeLabels[selectedTruck.typefuel as keyof typeof fuelTypeLabels] || selectedTruck.typefuel
                    : ""
                }
                disabled
                placeholder="Seleccione un camión primero"
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

          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              !formData.truckId ||
              !formData.driverId ||
              !formData.totalLoaded ||
              availableTrucks.length === 0 ||
              availableDrivers.length === 0 ||
              refreshing
            }
          >
            {loading ? "Creando Asignación..." : "Crear Asignación"}
          </Button>

          {/* Debug info - remove in production */}
          <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-50 rounded">
            <p>Debug: Total drivers: {localDrivers.length}</p>
            <p>Available drivers: {availableDrivers.length}</p>
            <p>Drivers with OPERADOR role: {localDrivers.filter((d) => d.role === "OPERADOR").length}</p>
            <p>Active drivers: {localDrivers.filter((d) => d.state === "Activo").length}</p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default AssignmentForm
