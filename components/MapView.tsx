"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Map, Maximize2, Minimize2, Navigation, MapPin, AlertCircle } from "lucide-react"
import { MapUtils } from "@/lib/map-utils"

// Tipos para Leaflet (se cargarán dinámicamente)
declare global {
  interface Window {
    L: any
  }
}

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
}

export function MapView({
  locations = [],
  center,
  zoom = 12,
  showRoute = false,
  height = "400px",
  onLocationClick,
  className,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const routeRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        // Cargar CSS de Leaflet
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement("link")
          link.rel = "stylesheet"
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          document.head.appendChild(link)
        }

        // Cargar JavaScript de Leaflet
        if (!(window as any).L) {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          script.onload = () => {
            setLeafletLoaded(true)
          }
          script.onerror = () => {
            setError("Error cargando Leaflet")
            setIsLoading(false)
          }
          document.head.appendChild(script)
        } else {
          setLeafletLoaded(true)
        }
      } catch (err) {
        setError("Error inicializando mapa")
        setIsLoading(false)
      }
    }

    loadLeaflet()
  }, [])

  // Inicializar mapa cuando Leaflet esté cargado
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return

    initializeMap()
    setIsLoading(false)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [leafletLoaded])

  // Actualizar mapa cuando cambien las ubicaciones
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return

    updateMapContent()
  }, [locations, showRoute, leafletLoaded])

  const initializeMap = () => {
    if (!mapRef.current || !(window as any).L) return

    const L = (window as any).L

    // Determinar centro del mapa
    const mapCenter =
      center ||
      (locations.length > 0
        ? MapUtils.calculateOptimalView(locations.map((loc) => ({ lat: loc.lat, lng: loc.lng }))).lat !== 0
          ? MapUtils.getBoundsCenter(MapUtils.calculateBounds(locations.map((loc) => ({ lat: loc.lat, lng: loc.lng }))))
          : MapUtils.DEFAULT_CENTER
        : MapUtils.DEFAULT_CENTER)

    // Crear mapa
    mapInstanceRef.current = L.map(mapRef.current).setView([mapCenter.lat, mapCenter.lng], zoom)

    // Agregar capa de OpenStreetMap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current)

    // Configurar controles
    mapInstanceRef.current.zoomControl.setPosition("topright")
  }

  const updateMapContent = () => {
    if (!mapInstanceRef.current || !(window as any).L) return

    const L = (window as any).L

    // Limpiar marcadores existentes
    markersRef.current.forEach((marker) => {
      mapInstanceRef.current.removeLayer(marker)
    })
    markersRef.current = []

    // Limpiar ruta existente
    if (routeRef.current) {
      mapInstanceRef.current.removeLayer(routeRef.current)
      routeRef.current = null
    }

    // Agregar nuevos marcadores
    locations.forEach((location) => {
      const icon = getLocationIcon(location.type, location.status)

      const marker = L.marker([location.lat, location.lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(createPopupContent(location))

      if (onLocationClick) {
        marker.on("click", () => onLocationClick(location))
      }

      markersRef.current.push(marker)
    })

    // Agregar ruta si está habilitada
    if (showRoute && locations.length > 1) {
      const routePoints = locations.map((loc) => [loc.lat, loc.lng])
      routeRef.current = L.polyline(routePoints, {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.7,
      }).addTo(mapInstanceRef.current)
    }

    // Ajustar vista para mostrar todas las ubicaciones
    if (locations.length > 0) {
      const group = new L.featureGroup(markersRef.current)
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
    }
  }

  const getLocationIcon = (type: string, status?: string) => {
    if (!(window as any).L) return null

    const L = (window as any).L

    const iconConfigs = {
      truck: { color: "#10b981", icon: "🚛" },
      delivery: { color: "#3b82f6", icon: "📦" },
      pickup: { color: "#f59e0b", icon: "⛽" },
      waypoint: { color: "#6b7280", icon: "📍" },
    }

    const config = iconConfigs[type as keyof typeof iconConfigs] || iconConfigs.waypoint

    // Ajustar color según estado
    let color = config.color
    if (status === "completed") color = "#10b981"
    else if (status === "error") color = "#ef4444"
    else if (status === "pending") color = "#f59e0b"

    return L.divIcon({
      html: `
        <div style="
          background-color: ${color};
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 3px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          ${config.icon}
        </div>
      `,
      className: "custom-div-icon",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    })
  }

  const createPopupContent = (location: MapLocation) => {
    const statusBadge = location.status
      ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${location.status}</span>`
      : ""

    return `
      <div class="p-2 min-w-[200px]">
        <div class="font-semibold text-gray-900 mb-1">${location.title}</div>
        ${location.description ? `<div class="text-sm text-gray-600 mb-2">${location.description}</div>` : ""}
        ${statusBadge}
        <div class="text-xs text-gray-500 mt-2">
          ${MapUtils.formatCoordinates(location.lat, location.lng)}
        </div>
      </div>
    `
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const centerOnLocations = () => {
    if (!mapInstanceRef.current || locations.length === 0) return

    const L = (window as any).L
    const group = new L.featureGroup(markersRef.current)
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1))
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={`${className} ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4" />
            Mapa de Ubicaciones
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
          className="w-full rounded-b-lg overflow-hidden"
        >
          {isLoading && (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <div className="text-sm text-gray-600">Cargando mapa...</div>
              </div>
            </div>
          )}
        </div>

        {locations.length === 0 && !isLoading && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <div className="text-center">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <div className="text-sm">No hay ubicaciones para mostrar</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
