"use client"

import React from "react"
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
import useAssignmentFormStore from "@/stores/assignmentForm"
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
const getFuelTypeLabel = (fuelType: FuelType, customFuelType?: string): string => {
  if (fuelType === 'PERSONALIZADO' && customFuelType) {
    return `Personalizado: ${customFuelType}`
  }
  return fuelTypeLabels[fuelType] || fuelType
}

export function AssignmentForm({ trucks, drivers, onSuccess, refreshing }: AssignmentFormProps) {
  const { toast } = useToast()
  const { formData, setFormData, resetForm } = useAssignmentFormStore()
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

     // Cuando se selecciona un camión, establecer el tipo de combustible por defecto automáticamente
   useEffect(() => {
     if (formData.truckId) {
       const truck = trucks.find((t) => t.id === Number(formData.truckId))
       if (truck) {
         // Automáticamente establecer el tipo de combustible del camión
         setFormData({ 
           fuelType: truck.typefuel,
           customFuelType: truck.typefuel === 'PERSONALIZADO' ? truck.customFuelType || '' : '',
           totalLoaded: truck.capacitygal.toString() // Usar la capacidad del camión como cantidad por defecto
         })
       }
     }
   }, [formData.truckId, trucks, setFormData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.truckId) {
      newErrors.truckId = "Debe seleccionar un camión"
    }

    if (!formData.driverId) {
      newErrors.driverId = "Debe seleccionar un conductor"
    }

    if (!formData.fuelType) {
      newErrors.fuelType = "Debe seleccionar un tipo de combustible"
    }

    if (formData.fuelType === 'PERSONALIZADO' && !formData.customFuelType?.trim()) {
      newErrors.customFuelType = "Debe especificar el tipo de combustible personalizado"
    }

         // Quantity is optional, but if provided, it must be valid
     if (formData.totalLoaded && Number(formData.totalLoaded) <= 0) {
       newErrors.totalLoaded = "La cantidad debe ser mayor a 0"
     }

    // Check if selected truck has sufficient capacity
    if (formData.truckId && formData.totalLoaded) {
      const selectedTruck = trucks.find((t) => t.id === Number(formData.truckId))
      const requestedAmount = Number(formData.totalLoaded)
      
      if (selectedTruck && requestedAmount > selectedTruck.capacitygal) {
        newErrors.totalLoaded = `La cantidad excede la capacidad del camión (${selectedTruck.capacitygal} gal)`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

         try {
       const quantity = formData.totalLoaded ? Number(formData.totalLoaded) : 0
       const unitPrice = 0 // Default value since it's not in the form
       const totalAmount = quantity * unitPrice
       const today = new Date()
       const deliveryDate = today.toISOString().split('T')[0]
       const deliveryTime = today.toTimeString().split(' ')[0]

       const response = await axios.post("/api/assignments", {
         truckId: Number(formData.truckId),
         driverId: Number(formData.driverId),
         fuelType: formData.fuelType,
         customFuelType: formData.fuelType === 'PERSONALIZADO' ? formData.customFuelType : undefined,
         quantity: quantity,
         unitPrice: unitPrice,
         totalAmount: totalAmount,
         deliveryDate: deliveryDate,
         deliveryTime: deliveryTime,
         status: 'pending',
         notes: formData.notes || '',
       })

      toast({
        title: "¡Éxito!",
        description: "Asignación creada correctamente",
      })

      resetForm()
      onSuccess?.()
    } catch (error: any) {
      console.error("Error creating assignment:", error.response?.data)
      toast({
        title: "Error",
        description: error.response?.data?.error || "Error al crear la asignación",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTruck = trucks.find((t) => t.id === Number(formData.truckId))
  const selectedDriver = drivers.find((d) => d.id === Number(formData.driverId))

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Camión */}
        <div className="space-y-2">
          <Label htmlFor="truckId">
            Camión <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.truckId}
            onValueChange={(value) => setFormData({ truckId: value })}
            disabled={isLoading || refreshing}
          >
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
               <div><strong>Capacidad:</strong> {selectedTruck.capacitygal} galones</div>
               <div><strong>Remanente:</strong> {selectedTruck.lastRemaining} galones</div>
               {selectedTruck.model && (
                 <div><strong>Modelo:</strong> {selectedTruck.model} {selectedTruck.year}</div>
               )}
             </div>
           )}
        </div>

        {/* Conductor */}
        <div className="space-y-2">
          <Label htmlFor="driverId">
            Conductor <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.driverId}
            onValueChange={(value) => setFormData({ driverId: value })}
            disabled={isLoading || refreshing}
          >
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

        {/* Tipo de Combustible */}
        <div className="space-y-2">
          <Label htmlFor="fuelType">
            Tipo de Combustible <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <Select
              value={formData.fuelType}
              onValueChange={(value) => setFormData({ fuelType: value })}
              disabled={isLoading || refreshing}
            >
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
            {selectedTruck && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData({ 
                    fuelType: selectedTruck.typefuel,
                    customFuelType: selectedTruck.typefuel === 'PERSONALIZADO' ? selectedTruck.customFuelType || '' : ''
                  })
                }}
                disabled={isLoading || refreshing}
                className="whitespace-nowrap"
              >
                Usar del Camión
              </Button>
            )}
          </div>
          {errors.fuelType && (
            <p className="text-sm text-red-500">{errors.fuelType}</p>
          )}
                     {selectedTruck && (
             <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
               <div><strong>Tipo del camión:</strong> {getFuelTypeLabel(selectedTruck.typefuel, selectedTruck.customFuelType)}</div>
               {formData.fuelType === selectedTruck.typefuel ? (
                 <div className="text-green-600">✅ Aplicado automáticamente del camión</div>
               ) : (
                 <div>Haga clic en "Usar del Camión" para aplicar automáticamente</div>
               )}
             </div>
           )}
        </div>

        {/* Tipo de Combustible Personalizado */}
        {formData.fuelType === 'PERSONALIZADO' && (
          <div className="space-y-2">
            <Label htmlFor="customFuelType">
              Tipo Personalizado <span className="text-red-500">*</span>
            </Label>
            <Input
              id="customFuelType"
              type="text"
              placeholder="Ej: Biodiésel B20, Gas Natural Comprimido, etc."
              value={formData.customFuelType || ''}
              onChange={(e) => setFormData({ customFuelType: e.target.value })}
              className={errors.customFuelType ? "border-red-500" : ""}
              disabled={isLoading || refreshing}
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
           <Label htmlFor="totalLoaded">
             Cantidad (galones) <span className="text-gray-500">(opcional)</span>
           </Label>
           <div className="flex items-center gap-2">
             <Input
               id="totalLoaded"
               type="number"
               step="0.01"
               placeholder="Ej: 1000"
               value={formData.totalLoaded}
               onChange={(e) => setFormData({ totalLoaded: e.target.value })}
               className={errors.totalLoaded ? "border-red-500" : ""}
               disabled={isLoading || refreshing}
             />
             {selectedTruck && (
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 onClick={() => {
                   setFormData({ totalLoaded: selectedTruck.capacitygal.toString() })
                 }}
                 disabled={isLoading || refreshing}
                 className="whitespace-nowrap"
               >
                 Usar Capacidad
               </Button>
             )}
           </div>
           {errors.totalLoaded && (
             <p className="text-sm text-red-500">{errors.totalLoaded}</p>
           )}
           {selectedTruck && (
             <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
               <div><strong>Capacidad del camión:</strong> {selectedTruck.capacitygal} galones</div>
               {formData.totalLoaded && Number(formData.totalLoaded) > 0 && (
                 <div>
                   {Number(formData.totalLoaded) === selectedTruck.capacitygal ? (
                     <div className="text-green-600">✅ Usando capacidad completa del camión</div>
                   ) : Number(formData.totalLoaded) > selectedTruck.capacitygal ? (
                     <div className="text-orange-600">⚠️ Excede la capacidad del camión</div>
                   ) : (
                     <div className="text-blue-600">ℹ️ Cantidad personalizada</div>
                   )}
                 </div>
               )}
             </div>
           )}
         </div>

        {/* Notas */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            placeholder="Notas adicionales (opcional)"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ notes: e.target.value })}
            className={errors.notes ? "border-red-500" : ""}
            rows={3}
            disabled={isLoading || refreshing}
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
      {(selectedTruck || selectedDriver) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Resumen de la Asignación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedTruck && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Camión
                  </h4>
                                     <div className="space-y-1 text-sm">
                     <div><strong>Placa:</strong> {selectedTruck.placa}</div>
                     <div><strong>Combustible:</strong> {getFuelTypeLabel(selectedTruck.typefuel, selectedTruck.customFuelType)}</div>
                     <div><strong>Capacidad:</strong> {selectedTruck.capacitygal} gal</div>
                     <div><strong>Remanente:</strong> {selectedTruck.lastRemaining} gal</div>
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
                     <div><strong>Nombre:</strong> {selectedDriver.name} {selectedDriver.lastname}</div>
                     <div><strong>DNI:</strong> {selectedDriver.dni}</div>
                     <div><strong>Email:</strong> {selectedDriver.email}</div>
                   </div>
                </div>
              )}
            </div>

                         {/* Información del pedido */}
             {formData.totalLoaded && Number(formData.totalLoaded) > 0 && (
               <div className="mt-4 pt-4 border-t">
                 <h4 className="font-medium mb-2">Detalles del Pedido</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                   <div>
                     <div><strong>Cantidad:</strong> {formData.totalLoaded} galones</div>
                     <div><strong>Combustible:</strong> {getFuelTypeLabel(formData.fuelType as FuelType, formData.customFuelType)}</div>
                   </div>
                   <div>
                     <div><strong>Estado:</strong> <Badge variant="secondary">Pendiente</Badge></div>
                   </div>
                 </div>
               </div>
             )}
          </CardContent>
        </Card>
      )}

             {/* Alertas de validación */}
       {selectedTruck && formData.totalLoaded && Number(formData.totalLoaded) > 0 && Number(formData.totalLoaded) > selectedTruck.lastRemaining && (
         <Alert variant="default">
           <AlertCircle className="h-4 w-4" />
           <AlertDescription>
             <strong>Información:</strong> La cantidad solicitada ({formData.totalLoaded} gal) excede el remanente actual del camión ({selectedTruck.lastRemaining} gal). Esto puede indicar una nueva carga o asignación.
           </AlertDescription>
         </Alert>
       )}

      {/* Botones */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading || refreshing} className="flex-1">
          {isLoading ? (
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
          disabled={isLoading || refreshing}
          className="px-8"
        >
          Limpiar
        </Button>
      </div>
    </form>
  )
}