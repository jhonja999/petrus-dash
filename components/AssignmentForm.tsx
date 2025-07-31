"use client"

import type React from "react"
import { useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Truck, User, AlertCircle, Plus, Loader2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFormStore } from "@/hooks/useFormStore"
import { useAssignmentFormStore, assignmentValidationRules, type AssignmentFormData } from "@/stores/assignmentFormStore"
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
  trucks: TruckData[]
  drivers: Driver[]
  onSuccess?: () => void
  refreshing?: boolean
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

export function AssignmentForm({ trucks, drivers, onSuccess, refreshing }: AssignmentFormProps) {
  const { toast } = useToast()
  
  // Usar el store unificado
  const assignmentStore = useAssignmentFormStore()
  const {
    formData,
    errors,
    isSubmitting,
    handleSubmit,
    getFieldProps,
    getSelectProps,
    setField,
    resetForm
  } = useFormStore(assignmentStore, assignmentValidationRules)

  // Calcular monto total automáticamente
  useEffect(() => {
    const quantity = formData.quantity || 0
    const unitPrice = formData.unitPrice || 0
    const total = quantity * unitPrice
    setField('totalAmount', total)
  }, [formData.quantity, formData.unitPrice, setField])

  // Cuando se selecciona un camión, establecer el tipo de combustible por defecto
  useEffect(() => {
    if (formData.truckId) {
      const truck = trucks.find((t) => t.id === Number(formData.truckId))
      if (truck) {
        setField('fuelType', truck.typefuel)
      }
    }
  }, [formData.truckId, trucks, setField])

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      const response = await axios.post("/api/assignments", {
        truckId: Number(data.truckId),
        driverId: Number(data.driverId),
        fuelType: data.fuelType,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        deliveryDate: data.deliveryDate,
        deliveryTime: data.deliveryTime,
        status: data.status,
        notes: data.notes,
      })

      toast({
        title: "¡Éxito!",
        description: "Asignación creada correctamente",
      })

      resetForm()
      onSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Error al crear la asignación",
        variant: "destructive",
      })
      throw error
    }
  }

  const selectedTruck = trucks.find((t) => t.id === Number(formData.truckId))
  const selectedDriver = drivers.find((d) => d.id === Number(formData.driverId))

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camión */}
        <div className="space-y-2">
          <Label htmlFor="truckId">
            Camión <span className="text-red-500">*</span>
          </Label>
          <Select {...getSelectProps('truckId')}>
            <SelectTrigger className={errors.truckId ? "border-red-500" : ""}>
              <SelectValue placeholder="Seleccionar camión" />
            </SelectTrigger>
            <SelectContent>
              {trucks
                .filter((truck) => truck.state === "Activo")
                .map((truck) => (
                  <SelectItem key={truck.id} value={truck.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {truck.placa} - {getFuelTypeLabel(truck.typefuel)}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.truckId && (
            <p className="text-sm text-red-500">{errors.truckId}</p>
          )}
          {selectedTruck && (
            <div className="text-sm text-gray-600">
              Capacidad: {selectedTruck.capacitygal} galones | 
              Remanente: {selectedTruck.lastRemaining} galones
            </div>
          )}
        </div>

        {/* Conductor */}
        <div className="space-y-2">
          <Label htmlFor="driverId">
            Conductor <span className="text-red-500">*</span>
          </Label>
          <Select {...getSelectProps('driverId')}>
            <SelectTrigger className={errors.driverId ? "border-red-500" : ""}>
              <SelectValue placeholder="Seleccionar conductor" />
            </SelectTrigger>
            <SelectContent>
              {drivers
                .filter((driver) => driver.state === "Activo")
                .map((driver) => (
                  <SelectItem key={driver.id} value={driver.id.toString()}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {driver.name} {driver.lastname} - {driver.dni}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.driverId && (
            <p className="text-sm text-red-500">{errors.driverId}</p>
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
              {Object.entries(fuelTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.fuelType && (
            <p className="text-sm text-red-500">{errors.fuelType}</p>
          )}
        </div>

        {/* Cantidad */}
        <div className="space-y-2">
          <Label htmlFor="quantity">
            Cantidad (galones) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="quantity"
            type="number"
            step="0.01"
            placeholder="Ej: 1000"
            {...getFieldProps('quantity')}
            className={errors.quantity ? "border-red-500" : ""}
          />
          {errors.quantity && (
            <p className="text-sm text-red-500">{errors.quantity}</p>
          )}
        </div>

        {/* Precio Unitario */}
        <div className="space-y-2">
          <Label htmlFor="unitPrice">
            Precio Unitario (S/) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            placeholder="Ej: 15.50"
            {...getFieldProps('unitPrice')}
            className={errors.unitPrice ? "border-red-500" : ""}
          />
          {errors.unitPrice && (
            <p className="text-sm text-red-500">{errors.unitPrice}</p>
          )}
        </div>

        {/* Monto Total */}
        <div className="space-y-2">
          <Label htmlFor="totalAmount">
            Monto Total (S/) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="totalAmount"
            type="number"
            step="0.01"
            placeholder="Calculado automáticamente"
            {...getFieldProps('totalAmount')}
            className={errors.totalAmount ? "border-red-500" : ""}
            readOnly
          />
          {errors.totalAmount && (
            <p className="text-sm text-red-500">{errors.totalAmount}</p>
          )}
        </div>

        {/* Fecha de Entrega */}
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">
            Fecha de Entrega <span className="text-red-500">*</span>
          </Label>
          <Input
            id="deliveryDate"
            type="date"
            {...getFieldProps('deliveryDate')}
            className={errors.deliveryDate ? "border-red-500" : ""}
          />
          {errors.deliveryDate && (
            <p className="text-sm text-red-500">{errors.deliveryDate}</p>
          )}
        </div>

        {/* Hora de Entrega */}
        <div className="space-y-2">
          <Label htmlFor="deliveryTime">
            Hora de Entrega <span className="text-red-500">*</span>
          </Label>
          <Input
            id="deliveryTime"
            type="time"
            {...getFieldProps('deliveryTime')}
            className={errors.deliveryTime ? "border-red-500" : ""}
          />
          {errors.deliveryTime && (
            <p className="text-sm text-red-500">{errors.deliveryTime}</p>
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
              <SelectItem value="PENDING">Pendiente</SelectItem>
              <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
              <SelectItem value="COMPLETED">Completado</SelectItem>
              <SelectItem value="CANCELLED">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-red-500">{errors.status}</p>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            placeholder="Notas adicionales (opcional)"
            {...getFieldProps('notes')}
            className={errors.notes ? "border-red-500" : ""}
          />
          {errors.notes && (
            <p className="text-sm text-red-500">{errors.notes}</p>
          )}
        </div>
      </div>

      {/* Información adicional */}
      {(selectedTruck || selectedDriver) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Información de la Asignación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTruck && (
                <div>
                  <h4 className="font-medium mb-2">Camión Seleccionado</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Placa:</strong> {selectedTruck.placa}</p>
                    <p><strong>Combustible:</strong> {getFuelTypeLabel(selectedTruck.typefuel)}</p>
                    <p><strong>Capacidad:</strong> {selectedTruck.capacitygal} galones</p>
                    <p><strong>Remanente:</strong> {selectedTruck.lastRemaining} galones</p>
                  </div>
                </div>
              )}
              {selectedDriver && (
                <div>
                  <h4 className="font-medium mb-2">Conductor Seleccionado</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nombre:</strong> {selectedDriver.name} {selectedDriver.lastname}</p>
                    <p><strong>DNI:</strong> {selectedDriver.dni}</p>
                    <p><strong>Email:</strong> {selectedDriver.email}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando asignación...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Crear Asignación
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
