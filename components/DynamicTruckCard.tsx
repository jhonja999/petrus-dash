"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { 
  Truck, 
  Fuel, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Edit3,
  Save,
  X,
  User
} from 'lucide-react'
import { useTruckManagementStore } from '@/stores/truckManagementStore'
import { useToast } from '@/hooks/use-toast'
import type { StoreTruck } from '@/stores/truckManagementStore'
import { $Enums } from "@prisma/client";
type TruckState = $Enums.TruckState;

interface DynamicTruckCardProps {
  truck: StoreTruck;
  onStateChange?: (newState: string) => void;
  onFuelUpdate?: (newLevel: number) => void;
  onDriverAssign?: (driverId: number) => void;
  realTimeUpdates?: boolean;
}

export function DynamicTruckCard({ 
  truck, 
  onStateChange, 
  onFuelUpdate, 
  onDriverAssign,
  realTimeUpdates = true 
}: DynamicTruckCardProps) {
  const { updateTruckState, updateFuelLevel, assignDriver } = useTruckManagementStore()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editingFuel, setEditingFuel] = useState(Number(truck.lastRemaining))
  const [isUpdating, setIsUpdating] = useState(false)

  const fuelPercentage = (Number(truck.lastRemaining) / Number(truck.capacitygal)) * 100
  const isLowFuel = fuelPercentage < 20
  const isCriticalFuel = fuelPercentage < 10

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Activo': return 'bg-green-100 text-green-800'
      case 'Asignado': return 'bg-blue-100 text-blue-800'
      case 'Mantenimiento': return 'bg-yellow-100 text-yellow-800'
      case 'Transito': return 'bg-purple-100 text-purple-800'
      case 'Descarga': return 'bg-orange-100 text-orange-800'
      case 'Inactivo': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFuelColor = () => {
    if (isCriticalFuel) return 'text-red-600'
    if (isLowFuel) return 'text-orange-600'
    return 'text-green-600'
  }

  const handleStateChange = async (newState: string) => {
    try {
      setIsUpdating(true)
      // Para actualizar el estado del camión:
      await updateTruckState(truck.id, newState as TruckState)
      onStateChange?.(newState)
      
      toast({
        title: "Estado actualizado",
        description: `Camión ${truck.placa} ahora está ${newState}`,
        className: "border-green-200 bg-green-50",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del camión",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleFuelUpdate = async () => {
    try {
      setIsUpdating(true)
      await updateFuelLevel(truck.id, editingFuel)
      onFuelUpdate?.(editingFuel)
      
      toast({
        title: "Combustible actualizado",
        description: `Nivel actualizado a ${editingFuel} galones`,
        className: "border-green-200 bg-green-50",
      })
      setIsEditing(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el nivel de combustible",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDriverAssign = async (driverId: number) => {
    try {
      setIsUpdating(true)
      await assignDriver(truck.id, driverId)
      onDriverAssign?.(driverId)
      
      toast({
        title: "Conductor asignado",
        description: `Conductor asignado al camión ${truck.placa}`,
        className: "border-green-200 bg-green-50",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo asignar el conductor",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Card className={`relative transition-all duration-200 hover:shadow-lg ${
      isLowFuel ? 'border-orange-200 bg-orange-50' : ''
    } ${isCriticalFuel ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg font-semibold">{truck.placa}</CardTitle>
            {realTimeUpdates && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStateColor(truck.state)}>
              {truck.state}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              disabled={isUpdating}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Información básica */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-600">Tipo de combustible</Label>
            <p className="text-sm">{truck.typefuel.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-600">Capacidad</Label>
            <p className="text-sm">{truck.capacitygal.toString()} galones</p>
          </div>
        </div>

        {/* Nivel de combustible */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Fuel className="h-4 w-4" />
              Nivel de combustible
            </Label>
            {isLowFuel && (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            )}
            {isCriticalFuel && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
          
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="number"
                value={editingFuel}
                onChange={(e) => setEditingFuel(Number(e.target.value))}
                min={0}
                max={Number(truck.capacitygal)}
                className="w-full"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleFuelUpdate}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingFuel(Number(truck.lastRemaining))
                    setIsEditing(false)
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${getFuelColor()}`}>
                  {truck.lastRemaining.toString()} galones
                </span>
                <span className="text-sm text-gray-500">
                  {fuelPercentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={fuelPercentage} className="h-2" />
              {isLowFuel && (
                <p className="text-xs text-orange-600">
                  ⚠️ Nivel de combustible bajo
                </p>
              )}
              {isCriticalFuel && (
                <p className="text-xs text-red-600">
                  🚨 Nivel crítico de combustible
                </p>
              )}
            </div>
          )}
        </div>

        {/* Estado del camión */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-600">Estado actual</Label>
          <Select
            value={truck.state}
            onValueChange={handleStateChange}
            disabled={isUpdating || truck.state === 'Asignado'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Activo">Activo</SelectItem>
              <SelectItem value="Inactivo">Inactivo</SelectItem>
              <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
              <SelectItem value="Transito">En Tránsito</SelectItem>
              <SelectItem value="Descarga">En Descarga</SelectItem>
              <SelectItem value="Asignado" disabled>Asignado</SelectItem>
            </SelectContent>
          </Select>
          {truck.state === 'Asignado' && (
            <p className="text-xs text-blue-600">
              ℹ️ No se puede cambiar el estado mientras esté asignado
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>Última actualización</span>
          </div>
          <div className="text-right">
            {truck.updatedAt ? new Date(truck.updatedAt).toLocaleString() : 'N/A'}
          </div>
        </div>

        {/* Indicadores de estado */}
        <div className="flex items-center gap-2">
          {truck.state === 'Activo' && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Disponible
            </Badge>
          )}
          {truck.state === 'Asignado' && (
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              <User className="h-3 w-3 mr-1" />
              Con conductor
            </Badge>
          )}
          {isLowFuel && (
            <Badge variant="outline" className="text-orange-700 border-orange-300">
              <Fuel className="h-3 w-3 mr-1" />
              Bajo combustible
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}