"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, Truck } from 'lucide-react'
import { useTruckManagementStore } from '@/stores/truckManagementStore'

export function TruckFiltersPanel() {
  const { filters, setFilter, clearFilters, getFilteredTrucks, trucks } = useTruckManagementStore()
  const [isExpanded, setIsExpanded] = useState(false)

  const fuelTypes = [
    'DIESEL_B5',
    'DIESEL_B500', 
    'GASOLINA_PREMIUM_95',
    'GASOLINA_REGULAR_90',
    'GASOHOL_84',
    'GASOHOL_90',
    'GASOHOL_95',
    'SOLVENTE',
    'GASOL'
  ]

  const truckStates = [
    'Activo',
    'Inactivo', 
    'Mantenimiento',
    'Transito',
    'Descarga',
    'Asignado'
  ]

  const filteredTrucks = getFilteredTrucks()
  const activeFilters = Object.entries(filters).filter(([_, value]) => 
    value !== 'all' && value !== '' && value !== false
  ).length

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            <CardTitle className="text-lg">Filtros de Camiones</CardTitle>
            {activeFilters > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilters} activo{activeFilters !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
            {activeFilters > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
        
        {/* Resumen de resultados */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Truck className="h-4 w-4" />
            <span>{filteredTrucks.length} de {trucks.length} camiones</span>
          </div>
          {filters.searchTerm && (
            <Badge variant="outline" className="text-xs">
              Buscando: "{filters.searchTerm}"
            </Badge>
          )}
          {filters.state !== 'all' && (
            <Badge variant="outline" className="text-xs">
              Estado: {filters.state}
            </Badge>
          )}
          {filters.fuelType !== 'all' && (
            <Badge variant="outline" className="text-xs">
              Combustible: {filters.fuelType}
            </Badge>
          )}
          {filters.assignedOnly && (
            <Badge variant="outline" className="text-xs">
              Solo Asignados
            </Badge>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Búsqueda por placa */}
            <div className="space-y-2">
              <Label htmlFor="search">Buscar por placa</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="ABC-123..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilter('searchTerm', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div className="space-y-2">
              <Label htmlFor="state">Estado del camión</Label>
              <Select
                value={filters.state}
                onValueChange={(value) => setFilter('state', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {truckStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por tipo de combustible */}
            <div className="space-y-2">
              <Label htmlFor="fuelType">Tipo de combustible</Label>
              <Select
                value={filters.fuelType}
                onValueChange={(value) => setFilter('fuelType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {fuelTypes.map((fuelType) => (
                    <SelectItem key={fuelType} value={fuelType}>
                      {fuelType.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por asignación */}
            <div className="space-y-2">
              <Label>Filtro de asignación</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="assignedOnly"
                  checked={filters.assignedOnly}
                  onChange={(e) => setFilter('assignedOnly', e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="assignedOnly" className="text-sm">
                  Solo camiones asignados
                </Label>
              </div>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {trucks.filter(t => t.state === 'Activo').length}
              </div>
              <div className="text-xs text-gray-600">Activos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {trucks.filter(t => t.state === 'Asignado').length}
              </div>
              <div className="text-xs text-gray-600">Asignados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {trucks.filter(t => t.state === 'Mantenimiento').length}
              </div>
              <div className="text-xs text-gray-600">Mantenimiento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {trucks.filter(t => Number(t.lastRemaining) > 0).length}
              </div>
              <div className="text-xs text-gray-600">Con combustible</div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
} 