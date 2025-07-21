"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  MapPin,
  Search,
  CheckCircle,
  Loader2,
  MapPinIcon,
  Building2,
  Factory,
  Truck,
  Navigation,
  Clock,
  Phone,
  Star,
  History,
  Plus,
  X,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface LocationData {
  latitude?: number
  longitude?: number
  address: string
  method: "OFFICE_PLANNED" | "MANUAL_INPUT" | "SEARCH_SELECTED" | "FREQUENT_LOCATION" | "GPS_MANUAL"
  accuracy?: number
  timestamp?: Date
  // Campos adicionales para oficina
  district?: string
  province?: string
  department?: string
  locationId?: string
  contactName?: string
  contactPhone?: string
  accessInstructions?: string
  references?: string
  locationType?: "carga" | "descarga" | "intermedio"
  zoneType?: "urbana" | "industrial" | "rural" | "puerto" | "aeropuerto"
}

interface LocationResult {
  place_id: string
  display_name: string
  lat: string
  lon: string
  type: string
  importance: number
  address?: {
    road?: string
    suburb?: string
    city?: string
    state?: string
    country?: string
    postcode?: string
  }
  distance?: number // Distancia desde Lima en km
}

interface FrequentLocation {
  id: string
  address: string
  latitude: number
  longitude: number
  district: string
  province: string
  department: string
  usageCount: number
  lastUsed: Date
  locationType: string
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
  locationType?: "carga" | "descarga" | "intermedio"
  isOfficeMode?: boolean // Nuevo prop para modo oficina
}

// Configuración específica para Perú
const PERU_CONFIG = {
  bounds: {
    north: -0.012,
    south: -18.35,
    east: -68.65,
    west: -81.33,
  },
  cities: {
    lima: { lat: -12.0464, lng: -77.0428, name: "Lima" },
    cajamarca: { lat: -7.1619, lng: -78.5151, name: "Cajamarca" },
  },
  commonPrefixes: ["Jr.", "Av.", "Cal.", "Psj.", "Prol.", "Urb.", "Mz.", "Lt."],
  departments: [
    "Lima",
    "Cajamarca",
    "La Libertad",
    "Ancash",
    "Huánuco",
    "Pasco",
    "Junín",
    "Huancavelica",
    "Ayacucho",
    "Apurímac",
    "Cusco",
    "Arequipa",
    "Moquegua",
    "Tacna",
    "Puno",
    "Madre de Dios",
    "Ucayali",
    "Loreto",
    "San Martín",
    "Amazonas",
    "Piura",
    "Lambayeque",
    "Tumbes",
    "Ica",
  ],
}

const LOCATION_TYPE_CONFIG = {
  carga: {
    label: "Punto de Carga",
    icon: Factory,
    color: "bg-blue-100 text-blue-800",
    description: "Origen del combustible (planta, terminal)",
  },
  descarga: {
    label: "Punto de Descarga",
    icon: MapPin,
    color: "bg-green-100 text-green-800",
    description: "Destino final de entrega",
  },
  intermedio: {
    label: "Punto Intermedio",
    icon: Truck,
    color: "bg-yellow-100 text-yellow-800",
    description: "Parada en ruta",
  },
}

export function LocationPicker({
  value,
  onChange,
  label = "Ubicación",
  required = false,
  placeholder = "Buscar ubicación en Perú...",
  showMap = true,
  className,
  onLocationSelect,
  initialAddress = "",
  locationType = "descarga",
  isOfficeMode = true,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState(value?.address || initialAddress)
  const [searchResults, setSearchResults] = useState<LocationResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [activeTab, setActiveTab] = useState<"search" | "manual" | "frequent">("search")
  const [frequentLocations, setFrequentLocations] = useState<FrequentLocation[]>([])
  const [showManualForm, setShowManualForm] = useState(false)

  // Estados para formulario manual
  const [manualForm, setManualForm] = useState({
    address: "",
    district: "",
    province: "",
    department: "Lima",
    references: "",
    contactName: "",
    contactPhone: "",
    accessInstructions: "",
    zoneType: "urbana" as const,
  })

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const { toast } = useToast()

  // Cargar ubicaciones frecuentes al montar
  useEffect(() => {
    loadFrequentLocations()
  }, [])

  // Actualizar estado interno cuando cambia el valor
  useEffect(() => {
    if (value) {
      setSearchQuery(value.address)
      if (value.latitude && value.longitude) {
        setSelectedLocation({ lat: value.latitude, lng: value.longitude })
      }
    }
  }, [value])

  // Cargar mapa
  useEffect(() => {
    if (!showMap || !mapRef.current) return

    const loadMap = async () => {
      if (typeof window !== "undefined") {
        try {
          if (!window.L) {
            const link = document.createElement("link")
            link.rel = "stylesheet"
            link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
            document.head.appendChild(link)

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

        // Centrar en Lima por defecto
        const initialLat = selectedLocation?.lat || PERU_CONFIG.cities.lima.lat
        const initialLng = selectedLocation?.lng || PERU_CONFIG.cities.lima.lng

        const map = L.map(mapRef.current).setView([initialLat, initialLng], 10)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 18,
        }).addTo(map)

        // Agregar marcadores para ciudades principales
        L.marker([PERU_CONFIG.cities.lima.lat, PERU_CONFIG.cities.lima.lng])
          .addTo(map)
          .bindPopup("Lima - Base Principal")

        L.marker([PERU_CONFIG.cities.cajamarca.lat, PERU_CONFIG.cities.cajamarca.lng])
          .addTo(map)
          .bindPopup("Cajamarca - Ruta Principal")

        map.on("click", (e: any) => {
          const { lat, lng } = e.latlng
          if (isWithinPeru(lat, lng)) {
            updateMapLocation(lat, lng)
            reverseGeocode(lat, lng)
          } else {
            toast({
              title: "Ubicación fuera de rango",
              description: "Solo se permiten ubicaciones dentro de Perú",
              variant: "destructive",
            })
          }
        })

        mapInstanceRef.current = map

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

  const loadFrequentLocations = async () => {
    try {
      const response = await fetch("/api/locations/frequent")
      if (response.ok) {
        const data = await response.json()
        setFrequentLocations(data.data || [])
      }
    } catch (error) {
      console.error("Error loading frequent locations:", error)
    }
  }

  const searchLocation = useCallback(
    async (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      if (!query.trim() || query.length < 3) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          // Búsqueda inteligente con bias hacia Lima y Cajamarca
          const searchQuery = query.includes("Perú") || query.includes("Peru") ? query : `${query}, Perú`

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
              `format=json&` +
              `q=${encodeURIComponent(searchQuery)}&` +
              `limit=8&` +
              `countrycodes=pe&` +
              `addressdetails=1&` +
              `extratags=1&` +
              `namedetails=1&` +
              `viewbox=${PERU_CONFIG.bounds.west},${PERU_CONFIG.bounds.south},${PERU_CONFIG.bounds.east},${PERU_CONFIG.bounds.north}&` +
              `bounded=1`,
            {
              headers: {
                "User-Agent": "PetrusDash/1.0 (Fuel Distribution System)",
              },
            },
          )

          if (response.ok) {
            const data = await response.json()

            // Procesar y enriquecer resultados
            const processedResults = data.map((result: any) => ({
              ...result,
              distance: calculateDistanceFromLima(Number.parseFloat(result.lat), Number.parseFloat(result.lon)),
              type: classifyLocationType(result),
            }))

            // Ordenar por relevancia (importancia + proximidad a rutas principales)
            const sortedResults = processedResults.sort((a: any, b: any) => {
              const aScore = calculateRelevanceScore(a)
              const bScore = calculateRelevanceScore(b)
              return bScore - aScore
            })

            setSearchResults(sortedResults)
            setShowSearchResults(sortedResults.length > 0)
          }
        } catch (error) {
          console.error("Search error:", error)
          toast({
            title: "Error de búsqueda",
            description: "No se pudo realizar la búsqueda. Inténtalo de nuevo.",
            variant: "destructive",
          })
        } finally {
          setIsSearching(false)
        }
      }, 300) // Debounce de 300ms
    },
    [toast],
  )

  const calculateDistanceFromLima = (lat: number, lng: number): number => {
    const R = 6371 // Radio de la Tierra en km
    const dLat = toRadians(lat - PERU_CONFIG.cities.lima.lat)
    const dLng = toRadians(lng - PERU_CONFIG.cities.lima.lng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(PERU_CONFIG.cities.lima.lat)) *
        Math.cos(toRadians(lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

  const classifyLocationType = (result: any): string => {
    const name = result.display_name.toLowerCase()
    const type = result.type?.toLowerCase() || ""

    if (name.includes("terminal") || name.includes("puerto") || name.includes("aeropuerto")) return "terminal"
    if (name.includes("grifo") || name.includes("estación") || name.includes("combustible")) return "fuel_station"
    if (name.includes("almacén") || name.includes("depósito")) return "warehouse"
    if (name.includes("fábrica") || name.includes("planta") || name.includes("industrial")) return "industrial"
    if (type.includes("city") || type.includes("town")) return "city"
    if (type.includes("suburb") || type.includes("neighbourhood")) return "district"
    return "address"
  }

  const calculateRelevanceScore = (result: any): number => {
    let score = result.importance || 0

    // Bonus por proximidad a Lima o Cajamarca
    if (result.distance < 50) score += 0.3
    else if (result.distance < 200) score += 0.2
    else if (result.distance < 500) score += 0.1

    // Bonus por tipo de ubicación relevante
    if (result.type === "terminal" || result.type === "fuel_station") score += 0.2
    if (result.type === "industrial" || result.type === "warehouse") score += 0.15

    return score
  }

  const selectSearchResult = (result: LocationResult) => {
    const lat = Number.parseFloat(result.lat)
    const lng = Number.parseFloat(result.lon)

    setSearchQuery(result.display_name)
    setSearchResults([])
    setShowSearchResults(false)
    setSelectedLocation({ lat, lng })
    updateMapLocation(lat, lng)

    const locationData: LocationData = {
      latitude: lat,
      longitude: lng,
      address: result.display_name,
      method: "SEARCH_SELECTED",
      timestamp: new Date(),
      district: result.address?.suburb || result.address?.city || "",
      province: result.address?.state || "",
      department: result.address?.state || "Lima",
      locationType,
    }

    onChange(locationData)

    // Guardar como ubicación frecuente
    saveFrequentLocation(locationData)
  }

  const selectFrequentLocation = (location: FrequentLocation) => {
    setSearchQuery(location.address)
    setSelectedLocation({ lat: location.latitude, lng: location.longitude })
    updateMapLocation(location.latitude, location.longitude)

    const locationData: LocationData = {
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      method: "FREQUENT_LOCATION",
      timestamp: new Date(),
      district: location.district,
      province: location.province,
      department: location.department,
      locationId: location.id,
      locationType,
    }

    onChange(locationData)
  }

  const handleManualSubmit = async () => {
    if (!manualForm.address.trim()) {
      toast({
        title: "Dirección requerida",
        description: "Debe ingresar una dirección",
        variant: "destructive",
      })
      return
    }

    // Intentar geocodificar la dirección manual
    try {
      const fullAddress = `${manualForm.address}, ${manualForm.district}, ${manualForm.province}, ${manualForm.department}, Perú`
      const coordinates = await geocodeAddress(fullAddress)

      const locationData: LocationData = {
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
        address: fullAddress,
        method: "MANUAL_INPUT",
        timestamp: new Date(),
        district: manualForm.district,
        province: manualForm.province,
        department: manualForm.department,
        contactName: manualForm.contactName,
        contactPhone: manualForm.contactPhone,
        accessInstructions: manualForm.accessInstructions,
        references: manualForm.references,
        zoneType: manualForm.zoneType,
        locationType,
      }

      if (coordinates) {
        setSelectedLocation({ lat: coordinates.lat, lng: coordinates.lng })
        updateMapLocation(coordinates.lat, coordinates.lng)
      }

      onChange(locationData)
      setShowManualForm(false)

      toast({
        title: "Ubicación guardada",
        description: "La ubicación manual ha sido registrada",
      })

      // Guardar como ubicación frecuente
      saveFrequentLocation(locationData)
    } catch (error) {
      // Si no se pueden obtener coordenadas, guardar solo la dirección
      const locationData: LocationData = {
        address: `${manualForm.address}, ${manualForm.district}, ${manualForm.province}, ${manualForm.department}`,
        method: "MANUAL_INPUT",
        timestamp: new Date(),
        district: manualForm.district,
        province: manualForm.province,
        department: manualForm.department,
        contactName: manualForm.contactName,
        contactPhone: manualForm.contactPhone,
        accessInstructions: manualForm.accessInstructions,
        references: manualForm.references,
        zoneType: manualForm.zoneType,
        locationType,
      }

      onChange(locationData)
      setShowManualForm(false)

      toast({
        title: "Ubicación guardada",
        description: "La ubicación manual ha sido registrada (sin coordenadas GPS)",
      })
    }
  }

  const saveFrequentLocation = async (location: LocationData) => {
    if (!location.latitude || !location.longitude) return

    try {
      await fetch("/api/locations/frequent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          district: location.district,
          province: location.province,
          department: location.department,
          locationType: location.locationType,
        }),
      })

      // Recargar ubicaciones frecuentes
      loadFrequentLocations()
    } catch (error) {
      console.error("Error saving frequent location:", error)
    }
  }

  const updateMapLocation = (lat: number, lng: number, panToLocation = true) => {
    if (!mapInstanceRef.current || !window.L) return

    const L = window.L

    if (markerRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
    }

    const typeConfig = LOCATION_TYPE_CONFIG[locationType]
    const icon = L.divIcon({
      html: `<div style="background-color: ${typeConfig.color.includes("blue") ? "#3b82f6" : typeConfig.color.includes("green") ? "#10b981" : "#f59e0b"}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px;">📍</div>`,
      className: "custom-div-icon",
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })

    markerRef.current = L.marker([lat, lng], { icon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`${typeConfig.label}<br>${lat.toFixed(6)}, ${lng.toFixed(6)}`)

    if (panToLocation) {
      mapInstanceRef.current.setView([lat, lng], 15)
    }

    onLocationSelect?.({
      address: searchQuery || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      lat,
      lng,
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
        },
      )

      if (response.ok) {
        const data = await response.json()
        const address = data.display_name || null
        if (address) {
          setSearchQuery(address)
        }
        return address
      }
    } catch (error) {
      console.warn("Reverse geocoding error:", error)
    }
    return null
  }

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address,
        )}&limit=1&countrycodes=pe&addressdetails=1`,
        {
          headers: {
            "User-Agent": "PetrusDash/1.0",
          },
        },
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

  const isWithinPeru = (lat: number, lng: number): boolean => {
    return (
      lat >= PERU_CONFIG.bounds.south &&
      lat <= PERU_CONFIG.bounds.north &&
      lng >= PERU_CONFIG.bounds.west &&
      lng <= PERU_CONFIG.bounds.east
    )
  }

  const getLocationTypeIcon = () => {
    const config = LOCATION_TYPE_CONFIG[locationType]
    const Icon = config.icon
    return <Icon className="h-4 w-4" />
  }

  const getLocationTypeConfig = () => LOCATION_TYPE_CONFIG[locationType]

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {getLocationTypeIcon()}
          {label}
          {required && <span className="text-red-500">*</span>}
          <Badge className={getLocationTypeConfig().color}>{getLocationTypeConfig().label}</Badge>
        </CardTitle>
        <p className="text-sm text-gray-600">{getLocationTypeConfig().description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {isOfficeMode && (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Búsqueda
              </TabsTrigger>
              <TabsTrigger value="frequent" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Frecuentes
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-3">
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        searchLocation(e.target.value)
                      }}
                      onBlur={() => {
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
                </div>

                {/* Resultados de búsqueda */}
                {showSearchResults && searchResults.length > 0 && (
                  <Card className="absolute z-50 w-full mt-1 max-h-80 overflow-y-auto shadow-lg">
                    <CardContent className="p-0">
                      {searchResults.map((result) => (
                        <button
                          key={result.place_id}
                          className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          onClick={() => selectSearchResult(result)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {result.type === "terminal" && <Factory className="h-4 w-4 text-blue-600" />}
                              {result.type === "fuel_station" && <Truck className="h-4 w-4 text-green-600" />}
                              {result.type === "industrial" && <Building2 className="h-4 w-4 text-purple-600" />}
                              {result.type === "city" && <MapPin className="h-4 w-4 text-red-600" />}
                              {!["terminal", "fuel_station", "industrial", "city"].includes(result.type) && (
                                <MapPinIcon className="h-4 w-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">
                                {result.address?.road || result.display_name.split(",")[0]}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{result.display_name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(result.distance || 0)} km de Lima
                                </Badge>
                                {result.type && (
                                  <Badge variant="secondary" className="text-xs">
                                    {result.type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="text-xs text-gray-500">
                💡 Busque por dirección, distrito, empresa o punto de referencia en Perú
              </div>
            </TabsContent>

            <TabsContent value="frequent" className="space-y-3">
              {frequentLocations.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {frequentLocations.map((location) => (
                    <button
                      key={location.id}
                      onClick={() => selectFrequentLocation(location)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{location.address.split(",")[0]}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {location.district}, {location.province}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Usado {location.usageCount} veces
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(location.lastUsed).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay ubicaciones frecuentes</p>
                  <p className="text-xs">Las ubicaciones que use se guardarán aquí</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              {!showManualForm ? (
                <div className="text-center py-6">
                  <Plus className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-4">Registre una nueva ubicación manualmente</p>
                  <Button onClick={() => setShowManualForm(true)} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Ubicación Manual
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Nueva Ubicación Manual</h4>
                    <Button variant="ghost" size="sm" onClick={() => setShowManualForm(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manual-address">Dirección *</Label>
                      <Input
                        id="manual-address"
                        value={manualForm.address}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, address: e.target.value }))}
                        placeholder="Jr. Los Olivos 123"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-district">Distrito</Label>
                      <Input
                        id="manual-district"
                        value={manualForm.district}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, district: e.target.value }))}
                        placeholder="San Isidro"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-province">Provincia</Label>
                      <Input
                        id="manual-province"
                        value={manualForm.province}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, province: e.target.value }))}
                        placeholder="Lima"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-department">Departamento</Label>
                      <Select
                        value={manualForm.department}
                        onValueChange={(value) => setManualForm((prev) => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERU_CONFIG.departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-contact">Contacto</Label>
                      <Input
                        id="manual-contact"
                        value={manualForm.contactName}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, contactName: e.target.value }))}
                        placeholder="Nombre del contacto"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-phone">Teléfono</Label>
                      <Input
                        id="manual-phone"
                        value={manualForm.contactPhone}
                        onChange={(e) => setManualForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                        placeholder="+51 999 999 999"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-references">Referencias</Label>
                    <Input
                      id="manual-references"
                      value={manualForm.references}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, references: e.target.value }))}
                      placeholder="Frente al banco, cerca del mercado..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-instructions">Instrucciones de Acceso</Label>
                    <Textarea
                      id="manual-instructions"
                      value={manualForm.accessInstructions}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, accessInstructions: e.target.value }))}
                      placeholder="Horarios, códigos de acceso, restricciones..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zone-type">Tipo de Zona</Label>
                    <Select
                      value={manualForm.zoneType}
                      onValueChange={(value: any) => setManualForm((prev) => ({ ...prev, zoneType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urbana">Urbana</SelectItem>
                        <SelectItem value="industrial">Industrial</SelectItem>
                        <SelectItem value="rural">Rural</SelectItem>
                        <SelectItem value="puerto">Puerto</SelectItem>
                        <SelectItem value="aeropuerto">Aeropuerto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleManualSubmit} className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Guardar Ubicación
                    </Button>
                    <Button variant="outline" onClick={() => setShowManualForm(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {value && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Ubicación Seleccionada</span>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs">
                  {value.method.replace("_", " ")}
                </Badge>
                {value.locationType && (
                  <Badge className={getLocationTypeConfig().color}>{getLocationTypeConfig().label}</Badge>
                )}
              </div>
            </div>
            <div className="text-sm text-blue-700">
              <div className="font-medium">{value.address}</div>
              {value.latitude && value.longitude && (
                <div className="text-xs mt-1">
                  📍 {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
                </div>
              )}
              {value.contactName && (
                <div className="text-xs mt-1 flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {value.contactName} {value.contactPhone && `- ${value.contactPhone}`}
                </div>
              )}
              {value.accessInstructions && (
                <div className="text-xs mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {value.accessInstructions}
                </div>
              )}
              {value.timestamp && <div className="text-xs mt-1">Actualizado: {value.timestamp.toLocaleString()}</div>}
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
                  <div className="text-sm">Cargando mapa de Perú...</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

declare global {
  interface Window {
    L: any
  }
}
