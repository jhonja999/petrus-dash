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
import { Truck, User, AlertCircle, Plus, Loader2, Info, MapPin } from "lucide-react"
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
  customFuelType?: string
  capacitygal: number
  lastRemaining: number
  state: string
  model?: string
  year?: number
}

interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
  latitude?: number
  longitude?: number
}

interface AssignmentFormProps {
  trucks: TruckData[]
  drivers: Driver[]
  customers: Customer[]
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
const getFuelTypeLabel = (fuelType: FuelType, customFuelType?: string): string => {
  if (fuelType === 'PERSONALIZADO' && customFuelType) {
    return `Personalizado: ${customFuelType}`
  }
  return fuelTypeLabels[fuelType] || fuelType
}

// Status labels in Spanish
const statusLabels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En Progreso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado"
}

export function AssignmentForm({ trucks, drivers, customers, onSuccess, refreshing }: AssignmentFormProps) {
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
        // Si el camión tiene un tipo personalizado, usarlo como valor por defecto
        if (truck.typefuel === 'PERSONALIZADO' && truck.customFuelType) {
          setField('customFuelType', truck.customFuelType)
        } else {
          setField('customFuelType', '')
        }
      }
    }
  }, [formData.truckId, trucks, setField])

  // Cuando se selecciona un cliente, establecer la ubicación
  useEffect(() => {
    if (formData.customerId) {
      const customer = customers.find((c) => c.id === Number(formData.customerId))
      if (customer && customer.latitude && customer.longitude) {
        setField('location', {
          latitude: customer.latitude,
          longitude: customer.longitude,
          address: customer.address
        })
      }
    }
  }, [formData.customerId, customers, setField])

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      const response = await axios.post("/api/assignments", {
        truckId: Number(data.truckId),
        driverId: Number(data.driverId),
        customerId: Number(data.customerId),
        fuelType: data.fuelType,
        customFuelType: data.fuelType === 'PERSONALIZADO' ? data.customFuelType : undefined,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        totalAmount: data.totalAmount,
        deliveryDate: data.deliveryDate,
        deliveryTime: data.deliveryTime,
        status: data.status,
        notes: data.notes,
        location: data.location,
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

  const handleFormSubmit = handleSubmit(onSubmit)

  const selectedTruck = trucks.find((t) => t.id === Number(formData.truckId))
  const selectedDriver = drivers.find((d) => d.id === Number(formData.driverId))
  const selectedCustomer = customers.find((c) => c.id === Number(formData.customerId))

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
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
                      <div className="flex flex-col">
                        <span>{truck.placa} - {getFuelTypeLabel(truck.typefuel, truck.customFuelType)}</span>
                        {truck.model && (
                          <span className="text-xs text-gray-500">
                            {truck.model} {truck.year ? `(${truck.year})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.truckId && (
            <p className="text-sm text-red-500">{errors.truckId}</p>
          )}
          {selectedTruck && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <p><strong>Capacidad:</strong> {selectedTruck.capacitygal} galones</p>
              <p><strong>Remanente:</strong> {selectedTruck.lastRemaining} galones</p>
              {selectedTruck.model && (
                <p><strong>Modelo:</strong> {selectedTruck.model} {selectedTruck.year}</p>
              )}
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
                      <div className="flex flex-col">
                        <span>{driver.name} {driver.lastname}</span>
                        <span className="text-xs text-gray-500">DNI: {driver.dni}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.driverId && (
            <p className="text-sm text-red-500">{errors.driverId}</p>
          )}
        </div>

        {/* Cliente */}
        <div className="space-y-2">
          <Label htmlFor="customerId">
            Cliente <span className="text-red-500">*</span>
          </Label>
          <Select {...getSelectProps('customerId')}>
            <SelectTrigger className={errors.customerId ? "border-red-500" : ""}>
              <SelectValue placeholder="Seleccionar cliente" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{customer.companyname}</span>
                      <span className="text-xs text-gray-500">RUC: {customer.ruc}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.customerId && (
            <p className="text-sm text-red-500">{errors.customerId}</p>
          )}
          {selectedCustomer && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <p><strong>Dirección:</strong> {selectedCustomer.address}</p>
              {selectedCustomer.latitude && selectedCustomer.longitude && (
                <p className="text-green-600">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Ubicación GPS disponible
                </p>
              )}
            </div>
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

        {/* Tipo de Combustible Personalizado */}
        {formData.fuelType === 'PERSONALIZADO' && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="customFuelType">
              Tipo Personalizado <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customFuelType"
              type="text"
              placeholder="Ej: Biodiésel B20, Gas Natural Comprimido, etc."
              value={formData.customFuelType || ''}
              onChange={(e) => setField('customFuelType', e.target.value)}
              onBlur={() => assignmentStore.validateField('customFuelType', assignmentValidationRules)}
              className={errors.customFuelType ? "border-red-500" : ""}
            />
            {errors.customFuelType && (
              <p className="text-sm text-red-500">{errors.customFuelType}</p>
            )}
            <p className="text-xs text-gray-500">
              Especifique el tipo de combustible personalizado para esta asignación
            </p>
          </div>
        )}

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
            value={formData.quantity || 0}
            onChange={(e) => setField('quantity', Number(e.target.value))}
            onBlur={() => assignmentStore.validateField('quantity', assignmentValidationRules)}
            className={errors.quantity ? "border-red-500" : ""}
          />
          {errors.quantity && (
            <p className="text-sm text-red-500">{errors.quantity}</p>
          )}
          {selectedTruck && formData.quantity > 0 && (
            <div className="text-xs text-gray-600">
              {formData.quantity > selectedTruck.capacitygal && (
                <p className="text-orange-600">
                  ⚠️ La cantidad excede la capacidad del camión ({selectedTruck.capacitygal} gal)
                </p>
              )}
              {formData.quantity > selectedTruck.lastRemaining && (
                <p className="text-red-600">
                  ⚠️ La cantidad excede el remanente disponible ({selectedTruck.lastRemaining} gal)
                </p>
              )}
            </div>
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
            value={formData.unitPrice || 0}
            onChange={(e) => setField('unitPrice', Number(e.target.value))}
            onBlur={() => assignmentStore.validateField('unitPrice', assignmentValidationRules)}
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
            value={formData.totalAmount || 0}
            className={`${errors.totalAmount ? "border-red-500" : ""} bg-gray-50`}
            readOnly
          />
          {errors.totalAmount && (
            <p className="text-sm text-red-500">{errors.totalAmount}</p>
          )}
          {formData.totalAmount > 0 && (
            <p className="text-sm text-green-600">
              S/ {formData.totalAmount.toFixed(2)}
            </p>
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
            value={formData.deliveryDate || ''}
            onChange={(e) => setField('deliveryDate', e.target.value)}
            onBlur={() => assignmentStore.validateField('deliveryDate', assignmentValidationRules)}
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
            value={formData.deliveryTime || ''}
            onChange={(e) => setField('deliveryTime', e.target.value)}
            onBlur={() => assignmentStore.validateField('deliveryTime', assignmentValidationRules)}
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
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <Badge variant={
                    value === 'PENDING' ? 'secondary' :
                    value === 'IN_PROGRESS' ? 'default' :
                    value === 'COMPLETED' ? 'outline' : 'destructive'
                  }>
                    {label}
                  </Badge>
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
          <Textarea
            id="notes"
            placeholder="Notas adicionales (opcional)"
            value={formData.notes || ''}
            onChange={(e) => setField('notes', e.target.value)}
            onBlur={() => assignmentStore.validateField('notes', assignmentValidationRules)}
            className={errors.notes ? "border-red-500" : ""}
            rows={3}
          />
          {errors.notes && (
            <p className="text-sm text-red-500">{errors.notes}</p>
          )}
          <p className="text-xs text-gray-500">
            {(formData.notes?.length || 0)}/500 caracteres
          </p>
        </div>
      </div>

      {/* Información de resumen */}
      {(selectedTruck || selectedDriver || selectedCustomer) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Resumen de la Asignación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedTruck && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Camión
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Placa:</strong> {selectedTruck.placa}</p>
                    <p><strong>Combustible:</strong> {getFuelTypeLabel(selectedTruck.typefuel, selectedTruck.customFuelType)}</p>
                    <p><strong>Capacidad:</strong> {selectedTruck.capacitygal} gal</p>
                    <p><strong>Remanente:</strong> {selectedTruck.lastRemaining} gal</p>
                  </div>
                </div>
              )}
              
              {selectedDriver && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Conductor
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Nombre:</strong> {selectedDriver.name} {selectedDriver.lastname}</p>
                    <p><strong>DNI:</strong> {selectedDriver.dni}</p>
                    <p><strong>Email:</strong> {selectedDriver.email}</p>
                  </div>
                </div>
              )}

              {selectedCustomer && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Cliente
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Empresa:</strong> {selectedCustomer.companyname}</p>
                    <p><strong>RUC:</strong> {selectedCustomer.ruc}</p>
                    <p><strong>Dirección:</strong> {selectedCustomer.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Información del pedido */}
            {formData.quantity > 0 && formData.unitPrice > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-2">Detalles del Pedido</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p><strong>Cantidad:</strong> {formData.quantity} galones</p>
                    <p><strong>Precio unitario:</strong> S/ {formData.unitPrice}</p>
                  </div>
                  <div>
                    <p><strong>Total:</strong> S/ {formData.totalAmount.toFixed(2)}</p>
                    <p><strong>Estado:</strong> {statusLabels[formData.status as keyof typeof statusLabels]}</p>
                  </div>
                  <div>
                    <p><strong>Fecha:</strong> {formData.deliveryDate}</p>
                    <p><strong>Hora:</strong> {formData.deliveryTime}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Alertas de validación */}
      {selectedTruck && formData.quantity > selectedTruck.lastRemaining && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atención:</strong> La cantidad solicitada ({formData.quantity} gal) excede el remanente disponible en el camión ({selectedTruck.lastRemaining} gal).
          </AlertDescription>
        </Alert>
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
          className="px-8"
        >
          Limpiar
        </Button>
      </div>
    </form>
  )
}