"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Grid3X3, 
  List, 
  Search, 
  Filter, 
  RefreshCw,
  Truck,
  Fuel,
  AlertTriangle
} from 'lucide-react'
import { useTruckManagementStore } from '@/stores/truckManagementStore'
import { DynamicTruckCard } from './DynamicTruckCard'
import { TruckFiltersPanel } from './TruckFiltersPanel'

type ViewMode = 'grid' | 'list'

export function TruckGridView() {
  const { 
    trucks, 
    loading, 
    error, 
    refreshTrucks,
    getFilteredTrucks,
    getActiveTrucks,
    getTrucksByState
  } = useTruckManagementStore()
  
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredTrucks = getFilteredTrucks()
  const activeTrucks = getActiveTrucks()
  const trucksInMaintenance = getTrucksByState('Mantenimiento')
  const trucksWithLowFuel = trucks.filter(t => {
    const fuelPercentage = (Number(t.lastRemaining) / Number(t.capacitygal)) * 100
    return fuelPercentage < 20
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshTrucks()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar camiones</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Reintentar
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Camiones</p>
                <p className="text-2xl font-bold text-gray-900">{trucks.length}</p>
              </div>
              <Truck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-green-600">{activeTrucks.length}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Truck className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Mantenimiento</p>
                <p className="text-2xl font-bold text-yellow-600">{trucksInMaintenance.length}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bajo Combustible</p>
                <p className="text-2xl font-bold text-orange-600">{trucksWithLowFuel.length}</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Fuel className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel de filtros */}
      <TruckFiltersPanel />

      {/* Controles de vista */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <span className="text-sm text-gray-600">
            {filteredTrucks.length} camión{filteredTrucks.length !== 1 ? 'es' : ''} mostrado{filteredTrucks.length !== 1 ? 's' : ''}
          </span>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </div>

      {/* Grid de camiones */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTrucks.map((truck) => (
            <DynamicTruckCard
              key={truck.id}
              truck={truck}
              realTimeUpdates={true}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTrucks.map((truck) => (
            <DynamicTruckCard
              key={truck.id}
              truck={truck}
              realTimeUpdates={true}
            />
          ))}
        </div>
      )}

      {/* Estado vacío */}
      {filteredTrucks.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se encontraron camiones
            </h3>
            <p className="text-gray-600 mb-4">
              No hay camiones que coincidan con los filtros aplicados
            </p>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Ver todos los camiones
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
} 