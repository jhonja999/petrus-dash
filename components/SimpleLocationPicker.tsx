"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MapPin, Navigation, Search, CheckCircle, AlertCircle } from "lucide-react"

interface LocationData {
  address: string
  latitude?: number
  longitude?: number
  method: "OFFICE_PLANNED" | "MANUAL" | "GPS" | "SEARCH_SELECTED"
  timestamp?: Date
}

interface SimpleLocationPickerProps {
  value: LocationData
  onChange: (location: LocationData) => void
  label: string
  placeholder?: string
  required?: boolean
  locationType: "carga" | "descarga"
  isOfficeMode?: boolean
}

// Ubicaciones predefinidas para Cajamarca
const CAJAMARCA_LOCATIONS = [
  {
    name: "Terminal de Combustibles Cajamarca",
    address: "Av. Hoyos Rubio 1250, Cajamarca",
    latitude: -7.1619,
    longitude: -78.5151,
    type: "carga"
  },
  {
    name: "Estación de Servicio Central",
    address: "Jr. Amazonas 750, Cajamarca",
    latitude: -7.1580,
    longitude: -78.5120,
    type: "descarga"
  },
  {
    name: "Zona Industrial Los Eucaliptos",
    address: "Carretera a Baños del Inca Km 3, Cajamarca",
    latitude: -7.1450,
    longitude: -78.4980,
    type: "descarga"
  },
  {
    name: "Mercado Central Cajamarca",
    address: "Jr. Amazonas 650, Cajamarca",
    latitude: -7.1610,
    longitude: -78.5140,
    type: "descarga"
  },
  {
    name: "Universidad Nacional de Cajamarca",
    address: "Av. Atahualpa 1050, Cajamarca",
    latitude: -7.1380,
    longitude: -78.5050,
    type: "descarga"
  }
]

export function SimpleLocationPicker({
  value,
  onChange,
  label,
  placeholder = "Buscar ubicación en Cajamarca...",
  required = false,
  locationType,
  isOfficeMode = true
}: SimpleLocationPickerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [suggestions, setSuggestions] = useState<typeof CAJAMARCA_LOCATIONS>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  // Filtrar ubicaciones por tipo
  const filteredLocations = CAJAMARCA_LOCATIONS.filter(loc => 
    locationType === "carga" ? loc.type === "carga" : loc.type === "descarga"
  )

  // Buscar ubicaciones cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.length > 2) {
      setIsSearching(true)
      const filtered = filteredLocations.filter(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setSuggestions(filtered)
      setShowSuggestions(true)
      setIsSearching(false)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchTerm, locationType])

  const handleLocationSelect = useCallback((location: typeof CAJAMARCA_LOCATIONS[0]) => {
    const locationData: LocationData = {
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      method: "SEARCH_SELECTED",
      timestamp: new Date()
    }
    
    onChange(locationData)
    setSearchTerm("")
    setShowSuggestions(false)
  }, [onChange])

  const handleManualInput = useCallback((address: string) => {
    const locationData: LocationData = {
      address,
      method: "MANUAL",
      timestamp: new Date()
    }
    onChange(locationData)
  }, [onChange])

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert("Geolocalización no disponible en este navegador")
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        
        // Verificar que esté en Cajamarca (aproximadamente)
        const isCajamarca = latitude >= -7.3 && latitude <= -6.9 && 
                           longitude >= -78.7 && longitude <= -78.3

        if (!isCajamarca) {
          alert("La ubicación detectada no está en Cajamarca")
          setIsGettingLocation(false)
          return
        }

        const locationData: LocationData = {
          address: `Ubicación GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          latitude,
          longitude,
          method: "GPS",
          timestamp: new Date()
        }
        
        onChange(locationData)
        setIsGettingLocation(false)
      },
      (error) => {
        console.error("Error obteniendo ubicación:", error)
        alert("No se pudo obtener la ubicación GPS")
        setIsGettingLocation(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    )
  }, [onChange])

  const isLocationConfirmed = value.address && value.address.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Búsqueda de ubicaciones */}
        <div className="space-y-2">
          <Label>Buscar ubicación</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            
            {/* Sugerencias */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((location, index) => (
                  <button
                    key={index}
                    onClick={() => handleLocationSelect(location)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{location.name}</div>
                    <div className="text-xs text-gray-600">{location.address}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ubicación manual */}
        <div className="space-y-2">
          <Label>O ingresa dirección manualmente</Label>
          <Input
            placeholder="Ej: Jr. Amazonas 123, Cajamarca"
            value={value.method === "MANUAL" ? value.address : ""}
            onChange={(e) => handleManualInput(e.target.value)}
          />
        </div>

        {/* GPS */}
        <div className="space-y-2">
          <Label>O usa tu ubicación actual</Label>
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="w-full"
          >
            <Navigation className="h-4 w-4 mr-2" />
            {isGettingLocation ? "Obteniendo ubicación..." : "Usar GPS"}
          </Button>
        </div>

        {/* Ubicación seleccionada */}
        {isLocationConfirmed && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Ubicación seleccionada:</div>
                <div className="text-sm">{value.address}</div>
                <div className="flex gap-2">
                  <Badge variant="outline">{value.method}</Badge>
                  {value.latitude && value.longitude && (
                    <Badge variant="secondary">
                      GPS: {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
                    </Badge>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Ubicaciones frecuentes */}
        <div className="space-y-2">
          <Label>Ubicaciones frecuentes en Cajamarca</Label>
          <div className="grid grid-cols-1 gap-2">
            {filteredLocations.slice(0, 3).map((location, index) => (
              <button
                key={index}
                onClick={() => handleLocationSelect(location)}
                className="text-left p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-sm">{location.name}</div>
                <div className="text-xs text-gray-600">{location.address}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Información de Cajamarca */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Zona de Operación: Cajamarca</span>
          </div>
          <div className="text-xs text-blue-700">
            Sistema optimizado para rutas dentro de la ciudad de Cajamarca y alrededores.
            Las coordenadas GPS se validan automáticamente para esta zona.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}