"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Navigation, Search, AlertCircle, CheckCircle, Loader2, MapPinIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface LocationData {
  latitude?: number
  longitude?: number
  address: string
  method: "GPS_AUTO" | "GPS_MANUAL" | "MANUAL_INPUT" | "OFFICE_PLANNED"
  accuracy?: number
  timestamp?: Date
}

interface GeolocationPosition {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp: number
}

interface LocationPickerProps {
  value?: LocationData
  onChange: (location: LocationData) => void
  label?: string
  required?: boolean
  placeholder?: string
  showMap?: boolean
  className?: string
  onLocationSelect?: (location: { address: string; lat: number; lng: number }) => void
  initialAddress?: string
}

interface LocationResult {
  display_name: string
  lat: string
  lon: string
  place_id: string
  address?: {
    road?: string
    city?: string
    state?: string
    country?: string
  }
}

// Geolocation Service
class GeolocationService {
  private static instance: GeolocationService

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService()
    }
    return GeolocationService.instance
  }

  async getCurrentPosition(options?: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada por este navegador"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          })
        },
        (error) => {
          let message = "Error desconocido"
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = "Permiso de ubicación denegado. Active la ubicación en su navegador."
              break
            case error.POSITION_UNAVAILABLE:
              message = "Información de ubicación no disponible."
              break
            case error.TIMEOUT:
              message = "Tiempo de espera agotado para obtener ubicación."
              break
          }
          reject(new Error(message))
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000, // 5 minutes
          ...options,
        }
      )
    })
  }

  static isWithinPeru(latitude: number, longitude: number): boolean {
    // Coordenadas aproximadas de Perú
    const peruBounds = {
      north: -0.01,
      south: -18.35,
      east: -68.65,
      west: -81.33,
    }

    return (
      latitude <= peruBounds.north &&
      latitude >= peruBounds.south &&
      longitude >= peruBounds.west &&
      longitude <= peruBounds.east
    )
  }

  static formatCoordinates(latitude: number, longitude: number): string {
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  }
}

export function LocationPicker({
  value,
  onChange,
  label = "Ubicación",
  required = false,
  placeholder = "Ingrese la dirección de entrega",
  showMap = true,
  className,
  onLocationSelect,
  initialAddress = "",
}: LocationPickerProps) {
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [gpsError, setGpsError] = useState<string>("")
  const [manualAddress, setManualAddress] = useState(value?.address || initialAddress)
  const [gpsPosition, setGpsPosition] = useState<GeolocationPosition | null>(null)
  const [activeTab, setActiveTab] = useState<"gps" | "manual">("gps")
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  
  const { toast } = useToast()
  const geolocationService = GeolocationService.getInstance()

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      setManualAddress(value.address)
      if (value.latitude && value.longitude) {
        setGpsPosition({
          latitude: value.latitude,
          longitude: value.longitude,
          accuracy: value.accuracy,
          timestamp: value.timestamp?.getTime() || Date.now(),
        })
        setSelectedLocation({ lat: value.latitude, lng: value.longitude })
      }
    }
  }, [value])

  // Load map when showMap is true
  useEffect(() => {
    if (!showMap || !mapRef.current) return

    const loadMap = async () => {
      if (typeof window !== "undefined") {
        try {
          // Check if Leaflet is already loaded
          if (!window.L) {
            // Load Leaflet CSS
            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            document.head.appendChild(link)

            // Load Leaflet JS
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement("script")
              script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
              script.onload = () => resolve()
              script.onerror = () => reject(new Error("Failed to load Leaflet"))
              document.head.appendChild(script)
            })
          }

          initializeMap()
        } catch (error) {
          console.error("Error loading map:", error)
        }
      }
    }

    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current || !window.L) return

      try {
        const L = window.L
        
        // Initialize map centered on Lima, Peru
        const initialLat = selectedLocation?.lat || gpsPosition?.latitude || -12.0464
        const initialLng = selectedLocation?.lng || gpsPosition?.longitude || -77.0428
        
        const map = L.map(mapRef.current).setView([initialLat, initialLng], 13)

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map)

        // Add click handler
        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng
          updateMapLocation(lat, lng)
          reverseGeocode(lat, lng)
        })

        mapInstanceRef.current = map

        // Add initial marker if we have coordinates
        if (selectedLocation) {
          updateMapLocation(selectedLocation.lat, selectedLocation.lng, false)
        }
      } catch (error) {
        console.error("Error initializing map:", error)
      }
    }

    loadMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  }, [showMap])

  // Update map when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && mapInstanceRef.current && window.L) {
      updateMapLocation(selectedLocation.lat, selectedLocation.lng, false)
    }
  }, [selectedLocation])

  const getCurrentLocation = async () => {
    setIsGettingLocation(true)
    setGpsError("")

    try {
      const position = await geolocationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      })

      setGpsPosition(position)
      setSelectedLocation({ lat: position.latitude, lng: position.longitude })

      // Validate location is within Peru
      if (!GeolocationService.isWithinPeru(position.latitude, position.longitude)) {
        setGpsError("La ubicación detectada parece estar fuera de Perú. Verifique su GPS.")
        toast({
          title: "Ubicación fuera de rango",
          description: "La ubicación detectada no está en Perú",
          variant: "destructive",
        })
      }

      // Get address through reverse geocoding
      const address = await reverseGeocode(position.latitude, position.longitude)

      const locationData: LocationData = {
        latitude: position.latitude,
        longitude: position.longitude,
        address: address || GeolocationService.formatCoordinates(position.latitude, position.longitude),
        method: "GPS_AUTO",
        accuracy: position.accuracy,
        timestamp: new Date(position.timestamp),
      }

      setManualAddress(locationData.address)
      onChange(locationData)

      toast({
        title: "Ubicación obtenida",
        description: "Se ha capturado la ubicación GPS exitosamente",
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al obtener ubicación"
      setGpsError(errorMessage)
      toast({
        title: "Error de GPS",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGettingLocation(false)
    }
  }

  const handleManualAddressSubmit = () => {
    if (!manualAddress.trim()) return

    const locationData: LocationData = {
      address: manualAddress.trim(),
      method: "MANUAL_INPUT",
      timestamp: new Date(),
    }

    onChange(locationData)
    toast({
      title: "Dirección guardada",
      description: "Se ha guardado la dirección manual",
    })
  }

  const searchCoordinates = async () => {
    if (!manualAddress.trim()) return

    setIsGettingLocation(true)
    setGpsError("")

    try {
      const coordinates = await geocodeAddress(manualAddress)

      if (coordinates) {
        setGpsPosition({
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          timestamp: Date.now(),
        })
        setSelectedLocation({ lat: coordinates.lat, lng: coordinates.lng })

        const locationData: LocationData = {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address: manualAddress,
          method: "GPS_MANUAL",
          timestamp: new Date(),
        }

        onChange(locationData)
        toast({
          title: "Coordenadas encontradas",
          description: "Se han obtenido las coordenadas para la dirección",
        })
      } else {
        // Use address only if coordinates couldn't be found
        handleManualAddressSubmit()
      }
    } catch (error) {
      console.error("Geocoding error:", error)
      setGpsError("No se pudieron obtener las coordenadas para esta dirección")
      // Still save the address
      handleManualAddressSubmit()
    } finally {
      setIsGettingLocation(false)
    }
  }

  const updateMapLocation = (lat: number, lng: number, panToLocation = true) => {
    if (!mapInstanceRef.current || !window.L) return

    const L = window.L

    // Remove existing marker
    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
    }

    // Add new marker
    markerRef.current = L.marker([lat, lng])
      .addTo(mapInstanceRef.current)
      .bindPopup(`Ubicación seleccionada<br>${lat.toFixed(6)}, ${lng.toFixed(6)}`)

    // Pan to location if requested
    if (panToLocation) {
      mapInstanceRef.current.setView([lat, lng], 15)
    }

    // Call onLocationSelect callback
    onLocationSelect?.({ 
      address: manualAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`, 
      lat, 
      lng 
    })
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "PetrusDash/1.0",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        return data.display_name || null
      }
    } catch (error) {
      console.warn("Reverse geocoding error:", error)
    }
    return null
  }

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // Add "Perú" to search query for better results
      const searchQuery = address.includes("Perú") || address.includes("Peru") 
        ? address 
        : `${address}, Perú`

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=1&countrycodes=pe&addressdetails=1`,
        {
          headers: {
            "User-Agent": "PetrusDash/1.0",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          return {
            lat: Number.parseFloat(data[0].lat),
            lng: Number.parseFloat(data[0].lon),
          }
        }
      }
    } catch (error) {
      console.warn("Geocoding error:", error)
    }
    return null
  }

  const searchLocation = async (query: string) => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const searchQuery = query.includes("Perú") || query.includes("Peru") 
          ? query 
          : `${query}, Perú`

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5&countrycodes=pe&addressdetails=1`
        )
        
        if (response.ok) {
          const data = await response.json()
          setSearchResults(data)
          setShowSearchResults(data.length > 0)
        }
      } catch (error) {
        console.error("Search error:", error)
        toast({
          title: "Error de búsqueda",
          description: "No se pudo buscar la ubicación. Inténtalo de nuevo.",
          variant: "destructive",
        })
      } finally {
        setIsSearching(false)
      }
    }, 500)
  }

  const selectSearchResult = (result: LocationResult) => {
    const lat = Number.parseFloat(result.lat)
    const lng = Number.parseFloat(result.lon)

    setManualAddress(result.display_name)
    setSearchResults([])
    setShowSearchResults(false)
    setSelectedLocation({ lat, lng })
    updateMapLocation(lat, lng)

    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      address: result.display_name,
      method: "GPS_MANUAL",
      timestamp: new Date(),
    }

    onChange(locationData)
  }

  const getAccuracyBadge = () => {
    if (!gpsPosition?.accuracy) return null

    const accuracy = gpsPosition.accuracy
    let variant: "default" | "secondary" | "destructive" = "default"
    let text = ""

    if (accuracy <= 10) {
      variant = "default"
      text = "Muy preciso"
    } else if (accuracy <= 50) {
      variant = "secondary"
      text = "Preciso"
    } else {
      variant = "destructive"
      text = "Poco preciso"
    }

    return (
      <Badge variant={variant} className="text-xs">
        {text} (±{Math.round(accuracy)}m)
      </Badge>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "gps" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gps" className="flex items-center gap-2">
              <Navigation className="h-4 w-4" />
              GPS Automático
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Ingreso Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gps" className="space-y-3">
            <div className="text-sm text-gray-600">
              Obtener ubicación automáticamente usando GPS del dispositivo
            </div>

            <Button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="w-full"
              variant={gpsPosition ? "outline" : "default"}
            >
              {isGettingLocation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Obteniendo ubicación...
                </>
              ) : gpsPosition ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Actualizar ubicación GPS
                </>
              ) : (
                <>
                  <Navigation className="mr-2 h-4 w-4" />
                  Obtener ubicación GPS
                </>
              )}
            </Button>

            {gpsPosition && (
              <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-800">Ubicación obtenida</span>
                  {getAccuracyBadge()}
                </div>
                <div className="text-xs text-green-700">
                  <div>
                    Coordenadas: {GeolocationService.formatCoordinates(gpsPosition.latitude, gpsPosition.longitude)}
                  </div>
                  <div>Fecha: {new Date(gpsPosition.timestamp).toLocaleString()}</div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="manual-address">Dirección de entrega</Label>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="manual-address"
                      value={manualAddress}
                      onChange={(e) => {
                        setManualAddress(e.target.value)
                        searchLocation(e.target.value)
                      }}
                      onBlur={() => {
                        // Hide search results after a short delay
                        setTimeout(() => setShowSearchResults(false), 150)
                      }}
                      onFocus={() => {
                        if (searchResults.length > 0) {
                          setShowSearchResults(true)
                        }
                      }}
                      placeholder={placeholder}
                      className="pr-10"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                    )}
                  </div>
                  <Button
                    onClick={searchCoordinates}
                    disabled={isGettingLocation || !manualAddress.trim()}
                    variant="outline"
                    size="icon"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto shadow-lg">
                    <CardContent className="p-0">
                      {searchResults.map((result) => (
                        <button
                          key={result.place_id}
                          className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          onClick={() => selectSearchResult(result)}
                        >
                          <div className="flex items-start gap-2">
                            <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">
                                {result.address?.road || result.display_name.split(',')[0]}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {result.display_name}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <Button
              onClick={handleManualAddressSubmit}
              disabled={!manualAddress.trim()}
              className="w-full"
              variant="outline"
            >
              <MapPin className="mr-2 h-4 w-4" />
              Usar esta dirección
            </Button>
          </TabsContent>
        </Tabs>

        {gpsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{gpsError}</AlertDescription>
          </Alert>
        )}

        {value && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Ubicación seleccionada</span>
              <Badge variant="outline" className="text-xs">
                {value.method.replace("_", " ")}
              </Badge>
            </div>
            <div className="text-sm text-blue-700">
              <div className="font-medium">{value.address}</div>
              {value.latitude && value.longitude && (
                <div className="text-xs mt-1">
                  {GeolocationService.formatCoordinates(value.latitude, value.longitude)}
                </div>
              )}
              {value.timestamp && (
                <div className="text-xs mt-1">
                  Actualizado: {value.timestamp.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}

        {showMap && (
          <div className="relative">
            <div ref={mapRef} className="w-full h-64 rounded-lg border border-gray-300 bg-gray-100" />
            {selectedLocation && (
              <div className="absolute top-2 left-2 z-[1000] pointer-events-none">
                <Badge className="bg-white text-gray-900 shadow-md border">
                  <Navigation className="h-3 w-3 mr-1" />
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </Badge>
              </div>
            )}
            {!mapInstanceRef.current && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center text-gray-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <div className="text-sm">Cargando mapa...</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Extend Window interface for Leaflet
declare global {
  interface Window {
    L: any
  }
}