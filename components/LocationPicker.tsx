"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  MapPin,
  Search,
  Navigation,
  Clock,
  AlertCircle,
  CheckCircle2,
  Star,
  Loader2,
  Phone,
  History,
  CrosshairIcon,
  Locate,
} from "lucide-react"
import axios from "axios"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Factory, Truck, Plus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Location {
  id?: number | string
  name: string
  address: string
  latitude: number
  longitude: number
  isFrequent?: boolean
  district?: string
  province?: string
  department?: string
  usageCount?: number
  lastUsed?: Date
}

export interface LocationData {
  latitude?: number
  longitude?: number
  address: string
  method: "OFFICE_PLANNED" | "MANUAL_INPUT" | "SEARCH_SELECTED" | "FREQUENT_LOCATION" | "GPS_MANUAL" | "GPS_AUTO"
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
  onChange?: (location: LocationData) => void
  onLocationSelect: (location: Location) => void
  selectedLocation?: Location | null
  label?: string
  required?: boolean
  placeholder?: string
  showMap?: boolean
  className?: string
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

// Términos comunes en direcciones peruanas para normalización
const PERU_ADDRESS_TERMS = {
  jr: "jiron",
  "jr.": "jiron",
  jirón: "jiron",
  av: "avenida",
  "av.": "avenida",
  ave: "avenida",
  "ave.": "avenida",
  cal: "calle",
  "cal.": "calle",
  psj: "pasaje",
  "psj.": "pasaje",
  pje: "pasaje",
  "pje.": "pasaje",
  mz: "manzana",
  "mz.": "manzana",
  lt: "lote",
  "lt.": "lote",
  urb: "urbanización",
  "urb.": "urbanización",
  "aa.hh": "asentamiento humano",
  aahh: "asentamiento humano",
  "pueblo joven": "pueblo joven",
  pj: "pueblo joven",
}

type ZoneType = "urbana" | "industrial" | "rural" | "puerto" | "aeropuerto"

export function LocationPicker({
  value,
  onChange,
  onLocationSelect,
  selectedLocation,
  label = "Ubicación",
  required = false,
  placeholder = "Buscar dirección o ubicación...",
  showMap = true,
  className,
  initialAddress = "",
  locationType = "descarga",
  isOfficeMode = true,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState(value?.address || initialAddress || "")
  const [searchResults, setSearchResults] = useState<Location[]>([])
  const [frequentLocations, setFrequentLocations] = useState<FrequentLocation[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [activeTab, setActiveTab] = useState<"search" | "manual" | "frequent" | "gps">("search")
  const [selectedLocationMap, setSelectedLocationMap] = useState<{ lat: number; lng: number } | null>(null)
  const [showManualForm, setShowManualForm] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  // Estados para formulario manual
  const [manualForm, setManualForm] = useState<{
    address: string
    district: string
    province: string
    department: string
    references: string
    contactName: string
    contactPhone: string
    accessInstructions: string
    zoneType: ZoneType
  }>({
    address: "",
    district: "",
    province: "",
    department: "Lima",
    references: "",
    contactName: "",
    contactPhone: "",
    accessInstructions: "",
    zoneType: "urbana",
  })

  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

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
        setSelectedLocationMap({ lat: value.latitude, lng: value.longitude })
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

        // Centrar en Cajamarca por defecto para punto de carga, Lima para descarga
        const defaultLocation = locationType === "carga" ? PERU_CONFIG.cities.cajamarca : PERU_CONFIG.cities.lima

        const initialLat = selectedLocationMap?.lat || defaultLocation.lat
        const initialLng = selectedLocationMap?.lng || defaultLocation.lng

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

        if (selectedLocationMap) {
          updateMapLocation(selectedLocationMap.lat, selectedLocationMap.lng, false)
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

  // Búsqueda con debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 500)
    } else {
      setSearchResults([])
      setShowResults(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const loadFrequentLocations = async () => {
    try {
      const response = await axios.get("/api/locations/frequent")
      setFrequentLocations(response.data)
    } catch (error) {
      console.error("Error loading frequent locations:", error)
    }
  }

  // Normalizar términos de direcciones peruanas
  const normalizePeruvianAddress = (address: string): string[] => {
    const normalized = address.toLowerCase().trim()
    const variations = [normalized]

    // Crear variaciones con términos normalizados
    let expandedAddress = normalized
    Object.entries(PERU_ADDRESS_TERMS).forEach(([abbrev, full]) => {
      if (expandedAddress.includes(abbrev)) {
        expandedAddress = expandedAddress.replace(new RegExp(`\\b${abbrev}\\b`, "g"), full)
      }
    })

    if (expandedAddress !== normalized) {
      variations.push(expandedAddress)
    }

    // Agregar variaciones con y sin números
    const withoutNumbers = normalized.replace(/\d+/g, "").replace(/\s+/g, " ").trim()
    if (withoutNumbers !== normalized && withoutNumbers.length > 3) {
      variations.push(withoutNumbers)
    }

    return variations
  }

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setIsSearching(true)
    setError(null)

    try {
      // Normalizar la consulta para direcciones peruanas
      const queryVariations = normalizePeruvianAddress(query)

      // Intentar geocodificación con múltiples variaciones
      let bestResults: Location[] = []

      for (const variation of queryVariations) {
        try {
          const response = await axios.get("/api/locations/geocode", {
            params: { address: variation },
          })

          if (response.data && response.data.length > 0) {
            const results = response.data.map((result: any) => ({
              name: result.display_name || result.name || variation,
              address: result.display_name || result.formatted_address || variation,
              latitude: Number.parseFloat(result.lat || result.latitude),
              longitude: Number.parseFloat(result.lon || result.longitude),
            }))

            // Filtrar resultados válidos en territorio peruano
            const validResults = results.filter(
              (loc: Location) =>
                loc.latitude >= -18.5 && loc.latitude <= -0.5 && loc.longitude >= -81.5 && loc.longitude <= -68.5,
            )

            if (validResults.length > 0) {
              bestResults = validResults
              break // Usar los primeros resultados válidos
            }
          }
        } catch (variationError) {
          console.warn(`Geocoding failed for variation: ${variation}`, variationError)
          continue
        }
      }

      // Si no hay resultados de geocodificación, buscar en ubicaciones guardadas
      if (bestResults.length === 0) {
        try {
          const savedResponse = await axios.get("/api/locations", {
            params: { search: query },
          })
          bestResults = savedResponse.data || []
        } catch (savedError) {
          console.warn("Error searching saved locations:", savedError)
        }
      }

      setSearchResults(bestResults)
      setShowResults(bestResults.length > 0)

      if (bestResults.length === 0) {
        setError(
          "No se encontraron ubicaciones. Intenta con una dirección más específica como 'Jiron Dos de Mayo 123, Cajamarca'",
        )
      }
    } catch (error) {
      console.error("Search error:", error)
      setError("Error al buscar ubicaciones. Verifica tu conexión e intenta nuevamente.")
      setSearchResults([])
      setShowResults(false)
    } finally {
      setIsSearching(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("La geolocalización no está disponible en este navegador")
      return
    }

    setIsGettingLocation(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords

          // Geocodificación inversa para obtener la dirección
          const response = await axios.get("/api/locations/reverse-geocode", {
            params: { lat: latitude, lon: longitude },
          })

          const location: Location = {
            name: response.data.name || "Mi ubicación actual",
            address: response.data.address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            latitude,
            longitude,
          }

          handleLocationSelect(location)
          setSearchQuery(location.address)
          setShowResults(false)
        } catch (error) {
          console.error("Reverse geocoding error:", error)
          // Usar coordenadas como fallback
          const location: Location = {
            name: "Mi ubicación actual",
            address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }
          handleLocationSelect(location)
          setSearchQuery(location.address)
          setShowResults(false)
        } finally {
          setIsGettingLocation(false)
        }
      },
      (error) => {
        setIsGettingLocation(false)
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError("Permiso de ubicación denegado. Habilita la ubicación en tu navegador.")
            break
          case error.POSITION_UNAVAILABLE:
            setError("Ubicación no disponible. Intenta nuevamente.")
            break
          case error.TIMEOUT:
            setError("Tiempo de espera agotado. Intenta nuevamente.")
            break
          default:
            setError("Error desconocido al obtener la ubicación.")
            break
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutos
      },
    )
  }

  const handleLocationSelect = async (location: Location) => {
    try {
      // Validar que la ubicación esté en territorio peruano
      const isValidLocation = await axios.get("/api/locations/validate", {
        params: { lat: location.latitude, lon: location.longitude },
      })

      if (!isValidLocation.data.valid) {
        setError("La ubicación seleccionada está fuera del territorio peruano")
        return
      }

      onLocationSelect(location)
      setSearchQuery(location.address)
      setShowResults(false)
      setError(null)

      // Guardar como ubicación frecuente si no existe
      if (!location.isFrequent) {
        try {
          await axios.post("/api/locations", {
            name: location.name,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude,
          })
          loadFrequentLocations() // Recargar ubicaciones frecuentes
        } catch (saveError) {
          console.warn("Could not save location as frequent:", saveError)
        }
      }
    } catch (error) {
      console.error("Location validation error:", error)
      setError("Error al validar la ubicación")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)

    if (value.trim() === "") {
      setShowResults(false)
      setError(null)
    }
  }

  const handleInputFocus = () => {
    if (frequentLocations.length > 0 && searchQuery.trim() === "") {
      setShowResults(true)
    }
  }

  const handleInputBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => setShowResults(false), 200)
  }

  const selectSearchResult = (result: LocationResult) => {
    const lat = Number.parseFloat(result.lat)
    const lng = Number.parseFloat(result.lon)

    setSearchQuery(result.display_name)
    setSearchResults([])
    setShowSearchResults(false)
    setSelectedLocationMap({ lat, lng })
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

    onChange?.(locationData)

    // Guardar como ubicación frecuente
    saveFrequentLocation(locationData)
  }

  const selectFrequentLocation = (location: FrequentLocation) => {
    setSearchQuery(location.address)
    setSelectedLocationMap({ lat: location.latitude, lng: location.longitude })
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

    onChange?.(locationData)
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

    // Construir dirección completa más específica
    const addressParts = [
      manualForm.address.trim(),
      manualForm.district.trim(),
      manualForm.province.trim(),
      manualForm.department.trim(),
      "Perú",
    ].filter(Boolean)

    const fullAddress = addressParts.join(", ")

    // Intentar geocodificar la dirección manual
    try {
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
        setSelectedLocationMap({ lat: coordinates.lat, lng: coordinates.lng })
        updateMapLocation(coordinates.lat, coordinates.lng)

        toast({
          title: "Ubicación geocodificada",
          description: "La dirección se ha localizado en el mapa",
        })
      } else {
        toast({
          title: "Ubicación guardada",
          description: "La dirección se ha guardado (geocodificación pendiente)",
        })
      }

      onChange?.(locationData)
      setShowManualForm(false)

      // Limpiar formulario manual
      setManualForm({
        address: "",
        district: "",
        province: "",
        department: "Lima",
        references: "",
        contactName: "",
        contactPhone: "",
        accessInstructions: "",
        zoneType: "urbana",
      })

      // Guardar como ubicación frecuente si tiene coordenadas
      if (coordinates) {
        saveFrequentLocation(locationData)
      }
    } catch (error) {
      console.error("Error processing manual address:", error)

      // Incluso si falla la geocodificación, guardar la dirección
      const locationData: LocationData = {
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

      onChange?.(locationData)
      setShowManualForm(false)

      // Limpiar formulario manual
      setManualForm({
        address: "",
        district: "",
        province: "",
        department: "Lima",
        references: "",
        contactName: "",
        contactPhone: "",
        accessInstructions: "",
        zoneType: "urbana",
      })

      toast({
        title: "Dirección guardada",
        description: "La dirección se ha guardado sin coordenadas GPS",
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
      name: searchQuery || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      address: searchQuery || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      latitude: lat,
      longitude: lng,
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
      // Preparar la dirección - si no incluye Perú, agregarlo
      let searchAddress = address.trim()
      if (!searchAddress.toLowerCase().includes("perú") && !searchAddress.toLowerCase().includes("peru")) {
        searchAddress = `${searchAddress}, Perú`
      }

      // Normalizar términos comunes peruanos
      searchAddress = searchAddress
        .replace(/\bjiron\b/gi, "jr.")
        .replace(/\bavenida\b/gi, "av.")
        .replace(/\bcalle\b/gi, "cal.")
        .replace(/\bpasaje\b/gi, "psj.")
        .replace(/\burbanización\b/gi, "urb.")
        .replace(/\bmanzana\b/gi, "mz.")
        .replace(/\blote\b/gi, "lt.")

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchAddress,
        )}&limit=3&countrycodes=pe&addressdetails=1&dedupe=1&extratags=1`,
        {
          headers: {
            "User-Agent": "PetrusDash/1.0",
          },
        },
      )

      if (response.ok) {
        const data = await response.json()
        if (data.length > 0) {
          // Tomar el primer resultado más relevante
          const bestResult = data[0]
          return {
            lat: Number.parseFloat(bestResult.lat),
            lng: Number.parseFloat(bestResult.lon),
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

  const getSuggestionText = () => {
    const suggestions = [
      "Jr. Los Olivos 123, San Isidro, Lima",
      "Av. Arequipa 456, Miraflores, Lima",
      "Jiron Dos de Mayo 789, Cajamarca",
      "Calle Real 321, Barranco, Lima",
      "Psj. Las Flores 654, Surco, Lima",
    ]

    return suggestions[Math.floor(Math.random() * suggestions.length)]
  }

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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="search" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Búsqueda
              </TabsTrigger>
              <TabsTrigger value="gps" className="flex items-center gap-2">
                <CrosshairIcon className="h-4 w-4" />
                GPS
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
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      ref={inputRef}
                      id="location-search"
                      type="text"
                      value={searchQuery}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                      placeholder={placeholder}
                      className="pl-10 pr-4"
                      required={required}
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={getCurrentLocation}
                    disabled={isGettingLocation}
                    title="Usar mi ubicación actual"
                  >
                    {isGettingLocation ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    ) : (
                      <Navigation className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Resultados de búsqueda */}
                {showResults && (
                  <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto shadow-lg">
                    <CardContent className="p-2">
                      {/* Ubicaciones frecuentes */}
                      {searchQuery.trim() === "" && frequentLocations.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2 px-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Ubicaciones frecuentes</span>
                          </div>
                          {frequentLocations.slice(0, 5).map((location, index) => (
                            <button
                              key={`frequent-${index}`}
                              type="button"
                              onClick={() =>
                                handleLocationSelect({
                                  id: location.id,
                                  isFrequent: true,
                                  name: location.address.split(",")[0],
                                  address: location.address,
                                  latitude: location.latitude,
                                  longitude: location.longitude,
                                  district: location.district,
                                  province: location.province,
                                  department: location.department,
                                  usageCount: location.usageCount,
                                  lastUsed: location.lastUsed,
                                })
                              }
                              className="w-full text-left p-2 hover:bg-gray-50 rounded-md transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{location.address.split(",")[0]}</div>
                                  <div className="text-xs text-gray-500 truncate">{location.address}</div>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  Frecuente
                                </Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Resultados de búsqueda */}
                      {searchResults.length > 0 && (
                        <div>
                          {searchQuery.trim() !== "" && (
                            <div className="flex items-center gap-2 mb-2 px-2">
                              <Search className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-700">Resultados de búsqueda</span>
                            </div>
                          )}
                          {searchResults.map((location, index) => (
                            <button
                              key={`search-${index}`}
                              type="button"
                              onClick={() => handleLocationSelect(location)}
                              className="w-full text-left p-2 hover:bg-gray-50 rounded-md transition-colors"
                            >
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{location.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{location.address}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Mensaje cuando no hay resultados */}
                      {searchQuery.trim() !== "" && searchResults.length === 0 && !isSearching && (
                        <div className="text-center py-4 text-gray-500">
                          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No se encontraron ubicaciones</p>
                          <p className="text-xs mt-1">Intenta con términos más específicos</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="text-xs text-gray-500">
                💡 Busque por dirección, distrito, empresa o punto de referencia en Perú
              </div>
            </TabsContent>

            <TabsContent value="gps" className="space-y-4">
              <div className="text-center py-6">
                <Locate className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-medium mb-2">Obtener Ubicación Actual</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use el GPS de su dispositivo para obtener la ubicación actual
                </p>

                <Button onClick={getCurrentLocation} disabled={isGettingLocation} className="w-full" size="lg">
                  {isGettingLocation ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Obteniendo ubicación...
                    </>
                  ) : (
                    <>
                      <CrosshairIcon className="h-4 w-4 mr-2" />
                      Usar Mi Ubicación GPS
                    </>
                  )}
                </Button>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-xs text-blue-800">
                    <strong>Nota:</strong> Asegúrese de permitir el acceso a la ubicación cuando su navegador lo
                    solicite. La ubicación debe estar dentro del territorio peruano.
                  </div>
                </div>
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
                      onValueChange={(value: ZoneType) => setManualForm((prev) => ({ ...prev, zoneType: value }))}
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
                      <CheckCircle2 className="h-4 w-4 mr-2" />
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
                  {value.accuracy && <span className="ml-2">±{Math.round(value.accuracy)}m</span>}
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

        {/* Ubicación seleccionada */}
        {selectedLocation && (
          <div className="mt-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-green-800">{selectedLocation.name}</div>
                    <div className="text-xs text-green-600 mt-1">{selectedLocation.address}</div>
                    <div className="text-xs text-green-500 mt-1">
                      {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Errores */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {showMap && (
          <div className="relative">
            <div ref={mapRef} className="w-full h-64 rounded-lg border border-gray-300 bg-gray-100" />
            {selectedLocationMap && (
              <div className="absolute top-2 left-2 z-[1000] pointer-events-none">
                <Badge className="bg-white text-gray-900 shadow-md border">
                  <Navigation className="h-3 w-3 mr-1" />
                  {selectedLocationMap.lat.toFixed(6)}, {selectedLocationMap.lng.toFixed(6)}
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

      {/* Ayuda contextual */}
      <div className="text-xs text-gray-500 mt-2">
        <p>
          💡 <strong>Ejemplos de direcciones:</strong>
        </p>
        <p>• "Jiron Dos de Mayo 123, Cajamarca"</p>
        <p>• "Av. Javier Prado 456, San Isidro, Lima"</p>
        <p>• "Cal. Las Flores 789, Arequipa"</p>
      </div>
    </Card>
  )
}

declare global {
  interface Window {
    L: any
  }
}

export default LocationPicker
