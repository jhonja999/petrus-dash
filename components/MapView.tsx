"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Map, Maximize2, Minimize2, Navigation, MapPin, AlertCircle, Truck, Route } from "lucide-react"

interface MapLocation {
  id: string
  lat: number
  lng: number
  type: "truck" | "delivery" | "pickup" | "waypoint"
  title: string
  description?: string
  status?: "active" | "completed" | "pending" | "error"
}

interface MapViewProps {
  locations: MapLocation[]
  center?: { lat: number; lng: number }
  zoom?: number
  showRoute?: boolean
  height?: string
  onLocationClick?: (location: MapLocation) => void
  className?: string
  focusArea?: "cajamarca" | "lima" | "peru"
}

// Configuración específica para Cajamarca
const CAJAMARCA_CONFIG = {
  center: { lat: -7.1619, lng: -78.5151 },
  bounds: {
    north: -6.9,
    south: -7.4,
    east: -78.2,
    west: -78.8
  },
  zoom: 13
}

export function MapView({
  locations = [],
  center,
  zoom = 12,
  showRoute = false,
  height = "400px",
  onLocationClick,
  className,
  focusArea = "cajamarca"
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null)

  // Determinar centro del mapa basado en el área de enfoque
  const getMapCenter = () => {
    if (center) return center
    
    switch (focusArea) {
      case "cajamarca":
        return CAJAMARCA_CONFIG.center
      case "lima":
        return { lat: -12.0464, lng: -77.0428 }
      default:
        return CAJAMARCA_CONFIG.center
    }
  }

  const mapCenter = getMapCenter()

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const centerOnLocations = () => {
    if (locations.length === 0) return
    
    // Si hay ubicaciones, centrar en la primera
    const firstLocation = locations[0]
    setSelectedLocation(firstLocation)
  }

  const getLocationIcon = (type: string, status?: string) => {
    const iconConfigs = {
      truck: { color: "#10b981", icon: "🚛", label: "Camión" },
      delivery: { color: "#3b82f6", icon: "📦", label: "Entrega" },
      pickup: { color: "#f59e0b", icon: "⛽", label: "Carga" },
      waypoint: { color: "#6b7280", icon: "📍", label: "Punto" },
    }

    const config = iconConfigs[type as keyof typeof iconConfigs] || iconConfigs.waypoint

    // Ajustar color según estado
    let color = config.color
    if (status === "completed") color = "#10b981"
    else if (status === "error") color = "#ef4444"
    else if (status === "pending") color = "#f59e0b"

    return { ...config, color }
  }

  const calculateDistance = (loc1: MapLocation, loc2: MapLocation): number => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = (loc2.lat - loc1.lat) * Math.PI / 180
    const dLng = (loc2.lng - loc1.lng) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  return (
    <Card className={`${className} ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4" />
            Mapa de Rutas - {focusArea === "cajamarca" ? "Cajamarca" : "Perú"}
            {locations.length > 0 && <Badge variant="secondary">{locations.length} ubicaciones</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={centerOnLocations} variant="outline" size="sm" disabled={locations.length === 0}>
              <Navigation className="h-4 w-4" />
            </Button>
            <Button onClick={toggleFullscreen} variant="outline" size="sm">
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={mapRef}
          style={{ height: isFullscreen ? "calc(100vh - 120px)" : height }}
          className="w-full rounded-b-lg overflow-hidden bg-gray-100 relative"
        >
          {/* Mapa simplificado para Cajamarca */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Mapa de Rutas - Cajamarca
              </h3>
              <p className="text-gray-600 mb-4">
                Centro: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
              </p>
              
              {/* Información de ubicaciones */}
              {locations.length > 0 && (
                <div className="space-y-2 max-w-md">
                  {locations.map((location) => {
                    const iconConfig = getLocationIcon(location.type, location.status)
                    return (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border cursor-pointer hover:bg-gray-50"
                        onClick={() => {
                          setSelectedLocation(location)
                          onLocationClick?.(location)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                            style={{ backgroundColor: iconConfig.color }}
                          >
                            {iconConfig.icon}
                          </div>
                          <div className="text-left">
                            <div className="font-medium text-sm">{location.title}</div>
                            <div className="text-xs text-gray-500">{location.description}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {iconConfig.label}
                          </Badge>
                          {location.status && (
                            <div className="text-xs text-gray-500 mt-1">
                              {location.status}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Mostrar ruta si está habilitada */}
              {showRoute && locations.length > 1 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Información de Ruta</span>
                  </div>
                  <div className="text-xs text-blue-700">
                    Distancia total: {locations.length > 1 ? 
                      calculateDistance(locations[0], locations[locations.length - 1]).toFixed(1) : 0} km
                  </div>
                  <div className="text-xs text-blue-700">
                    Puntos de parada: {locations.length}
                  </div>
                </div>
              )}

              {locations.length === 0 && (
                <div className="text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <div className="text-sm">No hay ubicaciones para mostrar</div>
                  <div className="text-xs mt-1">
                    Las ubicaciones aparecerán aquí cuando se configuren rutas
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Información de ubicación seleccionada */}
          {selectedLocation && (
            <div className="absolute bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{selectedLocation.title}</h4>
                  <p className="text-sm text-gray-600">{selectedLocation.description}</p>
                  <p className="text-xs text-gray-500">
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedLocation(null)}
                >
                  ✕
                </Button>
              </div>
            </div>
          )}

          {/* Indicador de área de enfoque */}
          <div className="absolute top-4 left-4">
            <Badge variant="outline" className="bg-white">
              📍 {focusArea === "cajamarca" ? "Cajamarca, Perú" : "Perú"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}