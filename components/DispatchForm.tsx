"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { CalendarIcon, MapPin, User, Fuel, AlertCircle, Save, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import type { Truck as TruckType, User as UserType, Customer, FuelType, DispatchFormData } from "@/types/globals"
import { validateCapacityAssignment } from "@/lib/capacity-utils"
import { getNextDispatchNumber } from "@/lib/dispatch-numbering"

interface DispatchFormProps {
  trucks: TruckType[]
  drivers: UserType[]
  customers: Customer[]
}

interface FormErrors {
  [key: string]: string
}

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: "DIESEL_B5", label: "Diésel B5" },
  { value: "DIESEL_B500", label: "Diésel B500" },
  { value: "GASOLINA_PREMIUM_95", label: "Gasolina Premium 95" },
  { value: "GASOLINA_REGULAR_90", label: "Gasolina Regular 90" },
  { value: "GASOHOL_84", label: "Gasohol 84" },
  { value: "GASOHOL_90", label: "Gasohol 90" },
  { value: "GASOHOL_95", label: "Gasohol 95" },
  { value: "SOLVENTE", label: "Solvente Industrial" },
  { value: "GASOL", label: "Gasol" },
  { value: "PERSONALIZADO", label: "Personalizado" },
]

const PRIORITY_OPTIONS = [
  { value: 1, label: "Normal", color: "bg-gray-100 text-gray-800" },
  { value: 2, label: "Alta", color: "bg-yellow-100 text-yellow-800" },
  { value: 3, label: "Urgente", color: "bg-red-100 text-red-800" },
]

export function DispatchForm({ trucks, drivers, customers }: DispatchFormProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [nextDispatchNumber, setNextDispatchNumber] = useState<string>("")
  const [formData, setFormData] = useState<DispatchFormData>({
    truckId: 0,
    driverId: 0,
    customerId: 0,
    fuelType: "DIESEL_B5", // Default fuel type
    customFuelName: "",
    quantity: 0,
    locationGPS: "",
    locationManual: "",
    address: "",
    scheduledDate: new Date(),
    notes: "",
    priority: 1,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTruck, setSelectedTruck] = useState<TruckType | null>(null)
  const [useGPS, setUseGPS] = useState(true)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [routeInfo, setRouteInfo] = useState<{
    distance: number
    duration: number
    fuelConsumption: number
    origin: string
    destination: string
  } | null>(null)
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)

  // Cargar el próximo número de despacho
  useEffect(() => {
    const loadNextNumber = async () => {
      try {
        const number = await getNextDispatchNumber()
        setNextDispatchNumber(number)
      } catch (error) {
        console.error("Error loading next dispatch number:", error)
      }
    }
    loadNextNumber()
  }, [])

  // Actualizar camión seleccionado cuando cambia truckId
  useEffect(() => {
    if (formData.truckId) {
      const truck = trucks.find((t) => t.id === formData.truckId)
      setSelectedTruck(truck || null)
    } else {
      setSelectedTruck(null)
    }
  }, [formData.truckId, trucks])

  const handleInputChange = (field: keyof DispatchFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Limpiar error del campo
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const calculateRoute = async (originCoords: string, destinationAddress: string) => {
    if (!originCoords || !destinationAddress) return

    setIsCalculatingRoute(true)
    try {
      // Primero geocodificar la dirección de destino
      const geocodeResponse = await fetch(`/api/locations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "geocode",
          address: destinationAddress,
        }),
      })

      const geocodeData = await geocodeResponse.json()
      if (!geocodeData.success) {
        throw new Error("No se pudo geocodificar la dirección de destino")
      }

      const { latitude: destLat, longitude: destLng } = geocodeData.data
      const [originLat, originLng] = originCoords.split(",").map((coord) => Number.parseFloat(coord.trim()))

      // Verificar que tenemos el token de Mapbox
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
      if (!mapboxToken) {
        throw new Error("Mapbox access token not configured")
      }

      // Calcular ruta usando Mapbox Directions API
      const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}?access_token=${mapboxToken}&geometries=geojson&overview=full`

      const directionsResponse = await fetch(directionsUrl)
      const directionsData = await directionsResponse.json()

      if (directionsData.routes && directionsData.routes.length > 0) {
        const route = directionsData.routes[0]
        const distanceKm = Math.round(route.distance / 1000)
        const durationHours = Math.round((route.duration / 3600) * 10) / 10

        // Calcular consumo estimado de combustible (asumiendo 3.5 km/L promedio para camiones)
        const fuelConsumptionL = Math.round(distanceKm / 3.5)

        // Obtener nombres de ubicaciones
        const originName = await reverseGeocode(originLat, originLng)
        const destinationName = geocodeData.data.address

        setRouteInfo({
          distance: distanceKm,
          duration: durationHours,
          fuelConsumption: fuelConsumptionL,
          origin: originName || `${originLat.toFixed(4)}, ${originLng.toFixed(4)}`,
          destination: destinationName,
        })
      }
    } catch (error) {
      console.error("Error calculating route:", error)
      toast({
        title: "Error",
        description: "No se pudo calcular la información de ruta",
        variant: "destructive",
      })
    } finally {
      setIsCalculatingRoute(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(`/api/locations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reverse-geocode",
          coordinates: { latitude: lat, longitude: lng },
        }),
      })

      const data = await response.json()
      return data.success ? data.data.address : null
    } catch (error) {
      console.error("Error reverse geocoding:", error)
      return null
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "La geolocalización no está disponible en este navegador",
        variant: "destructive",
      })
      return
    }

    setIsGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const gpsString = `${latitude}, ${longitude}`
        handleInputChange("locationGPS", gpsString)
        setIsGettingLocation(false)
        toast({
          title: "Ubicación obtenida",
          description: `Coordenadas: ${gpsString}`,
        })

        // Calcular ruta si ya hay dirección
        if (formData.address) {
          calculateRoute(gpsString, formData.address)
        }
      },
      (error) => {
        setIsGettingLocation(false)
        toast({
          title: "Error de geolocalización",
          description: "No se pudo obtener la ubicación actual",
          variant: "destructive",
        })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  // Convertir Truck a TruckCapacity para validación
  const convertTruckToCapacity = (truck: TruckType) => ({
    id: truck.id,
    capacitygal: Number(truck.capacitygal),
    currentLoad: Number(truck.currentLoad || 0),
    minCapacity: truck.minCapacity ? Number(truck.minCapacity) : null,
    maxCapacity: truck.maxCapacity ? Number(truck.maxCapacity) : null,
  })

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.truckId) newErrors.truckId = "Seleccione un camión"
    if (!formData.driverId) newErrors.driverId = "Seleccione un conductor"
    if (!formData.customerId) newErrors.customerId = "Seleccione un cliente"
    if (!formData.fuelType) newErrors.fuelType = "Seleccione el tipo de combustible"
    if (formData.fuelType === "PERSONALIZADO" && !formData.customFuelName?.trim()) {
      newErrors.customFuelName = "Especifique el nombre del combustible personalizado"
    }
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = "La cantidad debe ser mayor a 0"
    }
    if (!formData.address?.trim()) newErrors.address = "La dirección es obligatoria"
    if (!useGPS && !formData.locationManual?.trim()) {
      newErrors.locationManual = "Especifique la ubicación manual"
    }
    if (useGPS && !formData.locationGPS?.trim()) {
      newErrors.locationGPS = "Obtenga las coordenadas GPS"
    }

    // Validar capacidad del camión
    if (selectedTruck && formData.quantity > 0) {
      const truckCapacity = convertTruckToCapacity(selectedTruck)
      const validation = validateCapacityAssignment(truckCapacity, formData.quantity)
      if (!validation.isValid) {
        newErrors.quantity = validation.message || "Cantidad inválida"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({
        title: "Error de validación",
        description: "Por favor corrige los errores en el formulario",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const submitData = {
        truckId: formData.truckId,
        driverId: formData.driverId,
        customerId: formData.customerId,
        fuelType: formData.fuelType,
        customFuelName: formData.customFuelName || null,
        quantity: formData.quantity,
        address: formData.address, // This will be used as deliveryAddress
        locationGPS: useGPS ? formData.locationGPS || null : null,
        locationManual: !useGPS ? formData.locationManual || null : null,
        scheduledDate: formData.scheduledDate.toISOString(),
        priority: formData.priority,
        notes: formData.notes || null,
      }

      console.log("Submitting dispatch data:", submitData)

      const response = await fetch("/api/dispatches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Error al crear el despacho")
      }

      toast({
        title: "¡Éxito!",
        description: `Despacho ${data.data.dispatchNumber} creado exitosamente`,
      })

      // Redirigir al dashboard o lista de despachos
      router.push("/dispatches")
    } catch (error) {
      console.error("Error creating dispatch:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al crear el despacho",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      truckId: 0,
      driverId: 0,
      customerId: 0,
      fuelType: "DIESEL_B5",
      customFuelName: "",
      quantity: 0,
      locationGPS: "",
      locationManual: "",
      address: "",
      scheduledDate: new Date(),
      notes: "",
      priority: 1,
    })
    setErrors({})
    setSelectedTruck(null)
    setRouteInfo(null)
    // Re-fetch the next dispatch number after reset
    getNextDispatchNumber().then(setNextDispatchNumber)
  }

  const selectedDriver = drivers.find((d) => d.id === formData.driverId)
  const selectedCustomer = customers.find((c) => c.id === formData.customerId)
  const selectedPriority = PRIORITY_OPTIONS.find((p) => p.value === formData.priority)

  // Calcular información de capacidad para mostrar
  const getCapacityInfo = (truck: TruckType) => {
    const totalCapacity = Number(truck.capacitygal)
    const currentLoad = Number(truck.currentLoad || 0)
    const availableCapacity = Math.max(totalCapacity - currentLoad, 0)
    const utilizationPercentage = totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0

    return {
      totalCapacity,
      currentLoad,
      availableCapacity,
      utilizationPercentage,
      isOverCapacity: currentLoad > totalCapacity,
    }
  }

  // Recalcular ruta cuando cambien las coordenadas GPS o la dirección
  useEffect(() => {
  const { locationGPS, address } = formData

  if (useGPS && typeof locationGPS === 'string' && typeof address === 'string') {
    const timeoutId = setTimeout(() => {
      calculateRoute(locationGPS, address)
    }, 1000)

    return () => clearTimeout(timeoutId)
  } else {
    setRouteInfo(null)
  }
}, [formData.locationGPS, formData.address, useGPS])

  return (
    <div className="space-y-6">
      {/* Header con número de despacho */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Nuevo Despacho de Combustible</span>
            <Badge variant="outline" className="text-lg font-mono">
              {nextDispatchNumber || "PE-XXXXXX-2025"}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información del Vehículo y Conductor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Vehículo y Conductor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Selección de Camión */}
              <div className="space-y-2">
                <Label htmlFor="truckId">
                  Camión <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.truckId.toString()}
                  onValueChange={(value) => handleInputChange("truckId", Number.parseInt(value))}
                >
                  <SelectTrigger className={errors.truckId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione un camión" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{truck.placa}</span>
                          <Badge variant="secondary" className="ml-2">
                            {Number(truck.capacitygal).toLocaleString()} gal
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.truckId && <p className="text-sm text-red-500">{errors.truckId}</p>}
                <p className="text-xs text-gray-600">
                  Nota: Cualquier camión puede transportar cualquier tipo de combustible
                </p>
              </div>

              {/* Selección de Conductor */}
              <div className="space-y-2">
                <Label htmlFor="driverId">
                  Conductor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.driverId.toString()}
                  onValueChange={(value) => handleInputChange("driverId", Number.parseInt(value))}
                >
                  <SelectTrigger className={errors.driverId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione un conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        <div className="space-y-1">
                          <div className="font-medium">
                            {driver.name} {driver.lastname}
                          </div>
                          <div className="text-xs text-gray-500">{driver.email}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.driverId && <p className="text-sm text-red-500">{errors.driverId}</p>}
              </div>
            </div>

            {/* Información del conductor seleccionado */}
            {selectedDriver && (
              <Alert>
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Conductor:</strong> {selectedDriver.name} {selectedDriver.lastname} - {selectedDriver.email}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Capacidad del Tanque */}
        {selectedTruck && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5" />
                Capacidad del Tanque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Capacidad Total:</span>
                    <p className="text-lg font-bold text-blue-600">
                      {Number(selectedTruck.capacitygal).toLocaleString()} gal
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Carga Actual:</span>
                    <p className="text-lg font-bold text-orange-600">
                      {Number(selectedTruck.currentLoad || 0).toLocaleString()} gal
                    </p>
                  </div>
                  <div>
                    <span className="font-medium">Disponible:</span>
                    <p className="text-lg font-bold text-green-600">
                      {(Number(selectedTruck.capacitygal) - Number(selectedTruck.currentLoad || 0)).toLocaleString()}{" "}
                      gal
                    </p>
                  </div>
                </div>

                {/* Barra de progreso visual */}
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        (Number(selectedTruck.currentLoad || 0) / Number(selectedTruck.capacitygal)) * 100,
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <p className="text-xs text-gray-600">
                  Utilización actual:{" "}
                  {((Number(selectedTruck.currentLoad || 0) / Number(selectedTruck.capacitygal)) * 100).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tipo y Cantidad de Combustible */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              Tipo y Cantidad de Combustible
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Tipo de Combustible */}
              <div className="space-y-2">
                <Label htmlFor="fuelType">
                  Tipo de Combustible <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.fuelType}
                  onValueChange={(value) => handleInputChange("fuelType", value as FuelType)}
                >
                  <SelectTrigger className={errors.fuelType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Seleccione el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((fuel) => (
                      <SelectItem key={fuel.value} value={fuel.value}>
                        {fuel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fuelType && <p className="text-sm text-red-500">{errors.fuelType}</p>}
              </div>

              {/* Cantidad */}
              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Cantidad (Galones) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ej: 1000"
                  value={formData.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", Number.parseFloat(e.target.value) || 0)}
                  className={errors.quantity ? "border-red-500" : ""}
                />
                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
                {selectedTruck && formData.quantity > 0 && (
                  <p className="text-xs text-gray-600">
                    Disponible:{" "}
                    {(Number(selectedTruck.capacitygal) - Number(selectedTruck.currentLoad || 0)).toLocaleString()}{" "}
                    galones
                  </p>
                )}
              </div>
            </div>

            {/* Campo personalizado para combustible */}
            {formData.fuelType === "PERSONALIZADO" && (
              <div className="space-y-2">
                <Label htmlFor="customFuelName">
                  Nombre del Combustible Personalizado <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customFuelName"
                  placeholder="Ej: Combustible Especial XYZ"
                  value={formData.customFuelName || ""}
                  onChange={(e) => handleInputChange("customFuelName", e.target.value)}
                  className={errors.customFuelName ? "border-red-500" : ""}
                />
                {errors.customFuelName && <p className="text-sm text-red-500">{errors.customFuelName}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customerId">
                Cliente <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.customerId.toString()}
                onValueChange={(value) => handleInputChange("customerId", Number.parseInt(value))}
              >
                <SelectTrigger className={errors.customerId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Seleccione un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div className="space-y-1">
                        <div className="font-medium">{customer.companyname}</div>
                        <div className="text-xs text-gray-500">RUC: {customer.ruc}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-sm text-red-500">{errors.customerId}</p>}
            </div>

            {/* Información del cliente seleccionado */}
            {selectedCustomer && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <div>
                      <strong>Empresa:</strong> {selectedCustomer.companyname}
                    </div>
                    <div>
                      <strong>RUC:</strong> {selectedCustomer.ruc}
                    </div>
                    <div>
                      <strong>Dirección:</strong> {selectedCustomer.address}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Ubicación de Descarga */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ubicación de Descarga
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle GPS/Manual */}
            <div className="flex items-center space-x-4">
              <Button type="button" variant={useGPS ? "default" : "outline"} size="sm" onClick={() => setUseGPS(true)}>
                Geolocalización Automática
              </Button>
              <Button
                type="button"
                variant={!useGPS ? "default" : "outline"}
                size="sm"
                onClick={() => setUseGPS(false)}
              >
                Ingreso Manual
              </Button>
            </div>

            {useGPS ? (
              <div className="space-y-2">
                <Label htmlFor="locationGPS">
                  Coordenadas GPS <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="locationGPS"
                    placeholder="Latitud, Longitud"
                    value={formData.locationGPS || ""}
                    onChange={(e) => handleInputChange("locationGPS", e.target.value)}
                    className={errors.locationGPS ? "border-red-500" : ""}
                    readOnly
                  />
                  <Button type="button" onClick={getCurrentLocation} disabled={isGettingLocation} variant="outline">
                    {isGettingLocation ? "Obteniendo..." : "Obtener GPS"}
                  </Button>
                </div>
                {errors.locationGPS && <p className="text-sm text-red-500">{errors.locationGPS}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="locationManual">
                  Ubicación Manual <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="locationManual"
                  placeholder="Ej: Km 25 Carretera Central"
                  value={formData.locationManual || ""}
                  onChange={(e) => handleInputChange("locationManual", e.target.value)}
                  className={errors.locationManual ? "border-red-500" : ""}
                />
                {errors.locationManual && <p className="text-sm text-red-500">{errors.locationManual}</p>}
              </div>
            )}

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address">
                Dirección de Entrega <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                placeholder="Dirección completa de entrega"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                className={errors.address ? "border-red-500" : ""}
              />
              {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Información de Ruta */}
        {routeInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Información de Ruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Distancia</div>
                  <div className="text-2xl font-bold text-blue-600">{routeInfo.distance} km</div>
                  <div className="text-xs text-gray-500">Distancia total</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Tiempo Estimado</div>
                  <div className="text-2xl font-bold text-green-600">{routeInfo.duration} hrs</div>
                  <div className="text-xs text-gray-500">Tiempo de viaje</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-600">Consumo Estimado</div>
                  <div className="text-2xl font-bold text-orange-600">{routeInfo.fuelConsumption} L</div>
                  <div className="text-xs text-gray-500">Combustible necesario</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Punto de Origen:</span> {routeInfo.origin}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="text-sm">
                    <span className="font-medium">Punto de Descarga:</span> {routeInfo.destination}
                  </div>
                </div>
              </div>

              {isCalculatingRoute && (
                <div className="flex items-center gap-2 mt-4 text-sm text-gray-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  Calculando información de ruta...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Estado y Programación */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Estado y Programación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha y Hora Programada */}
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">
                  Fecha y Hora Programada <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={format(formData.scheduledDate, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => handleInputChange("scheduledDate", new Date(e.target.value))}
                  className={errors.scheduledDate ? "border-red-500" : ""}
                />
                {errors.scheduledDate && <p className="text-sm text-red-500">{errors.scheduledDate}</p>}
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridad</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(value) => handleInputChange("priority", Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value.toString()}>
                        <div className="flex items-center gap-2">
                          <Badge className={priority.color}>{priority.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estado inicial */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El despacho se creará con estado <Badge variant="secondary">PROGRAMADO</Badge>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Observaciones y Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones y Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Observaciones Adicionales</Label>
              <Textarea
                id="notes"
                placeholder="Ingrese cualquier observación relevante para el despacho, instrucciones especiales, contactos, etc."
                value={formData.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Botones de acción */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpiar Formulario
          </Button>

          <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Crear Despacho
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default DispatchForm
