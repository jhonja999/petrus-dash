"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Truck, 
  User, 
  MapPin, 
  Camera, 
  Fuel, 
  Calculator,
  AlertTriangle,
  Save,
  FileText,
  Trash2,
  Plus,
  Navigation
} from "lucide-react"
import { toast } from "sonner"
import type { FuelType, LocationMode, PhotoType } from "@/types/globals"

interface DispatchFormProps {
  trucks: any[]
  drivers: any[]
  customers: any[]
  onSuccess?: () => void
}

const FUEL_TYPES: { value: FuelType; label: string; color: string }[] = [
  { value: "DIESEL_B5", label: "Diesel B5", color: "bg-blue-100 text-blue-800" },
  { value: "DIESEL_B500", label: "Diesel B500", color: "bg-blue-200 text-blue-900" },
  { value: "GASOLINA_PREMIUM_95", label: "Gasolina Premium (95)", color: "bg-green-100 text-green-800" },
  { value: "GASOLINA_REGULAR_90", label: "Gasolina Regular (90)", color: "bg-green-200 text-green-900" },
  { value: "GASOHOL_84", label: "Gasohol 84", color: "bg-yellow-100 text-yellow-800" },
  { value: "GASOHOL_90", label: "Gasohol 90", color: "bg-yellow-200 text-yellow-900" },
  { value: "GASOHOL_95", label: "Gasohol 95", color: "bg-yellow-300 text-yellow-900" },
  { value: "SOLVENTE", label: "Solvente", color: "bg-purple-100 text-purple-800" },
  { value: "GASOL", label: "Gasol", color: "bg-orange-100 text-orange-800" },
  { value: "CUSTOM", label: "Personalizado", color: "bg-gray-100 text-gray-800" },
]

const PHOTO_TYPES: { value: PhotoType; label: string; required: boolean }[] = [
  { value: "INICIO_CARGA", label: "Inicio de Carga", required: true },
  { value: "TERMINO_CARGA", label: "Término de Carga", required: true },
  { value: "ENTREGA", label: "Entrega", required: true },
  { value: "CONFORMIDAD_CLIENTE", label: "Conformidad Cliente", required: true },
  { value: "ODOMETRO", label: "Odómetro", required: false },
  { value: "INCIDENCIA", label: "Incidencia", required: false },
]

export function DispatchForm({ trucks, drivers, customers, onSuccess }: DispatchFormProps) {
  const [formData, setFormData] = useState({
    // Vehicle and driver
    truckId: "",
    driverId: "",
    
    // Fuel information
    fuelType: "" as FuelType | "",
    customFuelType: "",
    totalQuantity: "",
    pricePerGallon: "",
    
    // Customer
    customerId: "",
    
    // Location
    locationMode: "GPS_AUTO" as LocationMode,
    manualLocation: "",
    
    // Timing
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: new Date().toTimeString().slice(0, 5),
    
    // Odometer
    initialKm: "",
    
    // Notes
    notes: "",
    observations: "",
  })

  const [selectedTruck, setSelectedTruck] = useState<any>(null)
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [photos, setPhotos] = useState<{ [key in PhotoType]?: File[] }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!autoSaveEnabled) return

    const interval = setInterval(() => {
      if (formData.truckId || formData.driverId || formData.totalQuantity) {
        localStorage.setItem('petrus_dispatch_draft', JSON.stringify(formData))
        toast.info("Borrador guardado automáticamente", { duration: 2000 })
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [formData, autoSaveEnabled])

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('petrus_dispatch_draft')
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft)
        setFormData(parsedDraft)
        toast.info("Borrador cargado", { description: "Se restauró el último borrador guardado" })
      } catch (error) {
        console.error("Error loading draft:", error)
      }
    }
  }, [])

  // Get GPS location
  useEffect(() => {
    if (formData.locationMode === "GPS_AUTO" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
          toast.success("Ubicación GPS obtenida", {
            description: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`
          })
        },
        (error) => {
          console.error("GPS error:", error)
          toast.error("Error al obtener GPS", {
            description: "Cambiando a modo manual"
          })
          setFormData(prev => ({ ...prev, locationMode: "MANUAL_INPUT" }))
        }
      )
    }
  }, [formData.locationMode])

  // Update selected truck when truckId changes
  useEffect(() => {
    if (formData.truckId) {
      const truck = trucks.find(t => t.id.toString() === formData.truckId)
      setSelectedTruck(truck)
      if (truck) {
        setFormData(prev => ({ ...prev, fuelType: truck.typefuel }))
      }
    } else {
      setSelectedTruck(null)
    }
  }, [formData.truckId, trucks])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoUpload = (photoType: PhotoType, files: FileList | null) => {
    if (!files) return

    const validFiles = Array.from(files).filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)
      const isValidSize = file.size <= 5 * 1024 * 1024 // 5MB
      
      if (!isValidType) {
        toast.error(`Archivo ${file.name} no es válido`, {
          description: "Solo se permiten JPG, PNG y PDF"
        })
        return false
      }
      
      if (!isValidSize) {
        toast.error(`Archivo ${file.name} es muy grande`, {
          description: "Máximo 5MB por archivo"
        })
        return false
      }
      
      return true
    })

    if (validFiles.length > 0) {
      setPhotos(prev => ({
        ...prev,
        [photoType]: [...(prev[photoType] || []), ...validFiles]
      }))
      
      toast.success(`${validFiles.length} foto(s) agregada(s)`, {
        description: `Tipo: ${PHOTO_TYPES.find(pt => pt.value === photoType)?.label}`
      })
    }
  }

  const removePhoto = (photoType: PhotoType, index: number) => {
    setPhotos(prev => ({
      ...prev,
      [photoType]: prev[photoType]?.filter((_, i) => i !== index) || []
    }))
    toast.info("Foto eliminada")
  }

  const calculateFinancials = () => {
    const quantity = parseFloat(formData.totalQuantity) || 0
    const price = parseFloat(formData.pricePerGallon) || 0
    const subtotal = quantity * price
    const igv = subtotal * 0.18
    const total = subtotal + igv
    
    return { subtotal, igv, total }
  }

  const getCapacityProgress = () => {
    if (!selectedTruck || !formData.totalQuantity) return 0
    const quantity = parseFloat(formData.totalQuantity)
    const capacity = parseFloat(selectedTruck.capacitygal.toString())
    return Math.min((quantity / capacity) * 100, 100)
  }

  const getAvailableCapacity = () => {
    if (!selectedTruck) return 0
    const capacity = parseFloat(selectedTruck.capacitygal.toString())
    const current = parseFloat(selectedTruck.currentLoad?.toString() || "0")
    const requested = parseFloat(formData.totalQuantity) || 0
    return capacity - current - requested
  }

  const validateForm = () => {
    const errors: string[] = []
    
    if (!formData.truckId) errors.push("Selecciona un camión")
    if (!formData.driverId) errors.push("Selecciona un conductor")
    if (!formData.fuelType) errors.push("Selecciona tipo de combustible")
    if (!formData.totalQuantity) errors.push("Ingresa cantidad de combustible")
    if (!formData.customerId) errors.push("Selecciona un cliente")
    
    if (formData.fuelType === "CUSTOM" && !formData.customFuelType) {
      errors.push("Especifica el tipo de combustible personalizado")
    }
    
    if (formData.locationMode === "MANUAL_INPUT" && !formData.manualLocation) {
      errors.push("Ingresa la ubicación manual")
    }
    
    if (selectedTruck && formData.totalQuantity) {
      const available = getAvailableCapacity()
      if (available < 0) {
        errors.push(`Cantidad excede capacidad disponible (${Math.abs(available).toFixed(2)} gal sobre límite)`)
      }
    }
    
    // Check required photos
    const missingPhotos = PHOTO_TYPES
      .filter(pt => pt.required && (!photos[pt.value] || photos[pt.value]!.length === 0))
      .map(pt => pt.label)
    
    if (missingPhotos.length > 0) {
      errors.push(`Fotos requeridas faltantes: ${missingPhotos.join(", ")}`)
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      toast.error("Errores en el formulario", {
        description: errors.join(". ")
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create FormData for file upload
      const submitData = new FormData()
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) submitData.append(key, value.toString())
      })
      
      // Add GPS location if available
      if (gpsLocation) {
        submitData.append('gpsLatitude', gpsLocation.lat.toString())
        submitData.append('gpsLongitude', gpsLocation.lng.toString())
      }
      
      // Add photos
      Object.entries(photos).forEach(([photoType, files]) => {
        files?.forEach((file, index) => {
          submitData.append(`photos_${photoType}_${index}`, file)
        })
      })
      
      // Calculate financials
      const { subtotal, igv, total } = calculateFinancials()
      submitData.append('subtotal', subtotal.toString())
      submitData.append('igv', igv.toString())
      submitData.append('total', total.toString())

      // Submit to API
      const response = await fetch('/api/dispatches', {
        method: 'POST',
        body: submitData
      })

      if (!response.ok) {
        throw new Error('Error al crear despacho')
      }

      const result = await response.json()
      
      toast.success("Despacho creado exitosamente", {
        description: `Número: ${result.dispatchNumber}`
      })
      
      // Clear form and draft
      setFormData({
        truckId: "",
        driverId: "",
        fuelType: "" as FuelType | "",
        customFuelType: "",
        totalQuantity: "",
        pricePerGallon: "",
        customerId: "",
        locationMode: "GPS_AUTO",
        manualLocation: "",
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: new Date().toTimeString().slice(0, 5),
        initialKm: "",
        notes: "",
        observations: "",
      })
      setPhotos({})
      localStorage.removeItem('petrus_dispatch_draft')
      
      onSuccess?.()
      
    } catch (error) {
      console.error("Error creating dispatch:", error)
      toast.error("Error al crear despacho", {
        description: error instanceof Error ? error.message : "Error desconocido"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearForm = () => {
    setFormData({
      truckId: "",
      driverId: "",
      fuelType: "" as FuelType | "",
      customFuelType: "",
      totalQuantity: "",
      pricePerGallon: "",
      customerId: "",
      locationMode: "GPS_AUTO",
      manualLocation: "",
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTime: new Date().toTimeString().slice(0, 5),
      initialKm: "",
      notes: "",
      observations: "",
    })
    setPhotos({})
    localStorage.removeItem('petrus_dispatch_draft')
    toast.info("Formulario limpiado")
  }

  const availableCapacity = getAvailableCapacity()
  const capacityProgress = getCapacityProgress()
  const { subtotal, igv, total } = calculateFinancials()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Nuevo Despacho Petrus
          </CardTitle>
          <CardDescription>
            Sistema completo de gestión de despachos de combustible
          </CardDescription>
        </CardHeader>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle and Driver Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Vehículo y Conductor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="truck">Camión *</Label>
                <Select value={formData.truckId} onValueChange={(value) => handleInputChange("truckId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar camión" />
                  </SelectTrigger>
                  <SelectContent>
                    {trucks.map((truck) => (
                      <SelectItem key={truck.id} value={truck.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{truck.placa}</span>
                          <Badge variant="outline" className="ml-2">
                            {parseFloat(truck.capacitygal.toString()).toLocaleString()} gal
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver">Conductor *</Label>
                <Select value={formData.driverId} onValueChange={(value) => handleInputChange("driverId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar conductor" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id.toString()}>
                        <div className="flex flex-col">
                          <span>{driver.name} {driver.lastname}</span>
                          <span className="text-xs text-gray-500">{driver.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Truck Capacity Visualization */}
            {selectedTruck && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Capacidad del Camión</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {parseFloat(selectedTruck.capacitygal.toString()).toLocaleString()} gal máx.
                  </Badge>
                </div>
                <Progress value={capacityProgress} className="h-3" />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Actual:</span>
                    <p className="font-semibold">{parseFloat(selectedTruck.currentLoad?.toString() || "0").toFixed(2)} gal</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Solicitado:</span>
                    <p className="font-semibold text-blue-600">{parseFloat(formData.totalQuantity || "0").toFixed(2)} gal</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Disponible:</span>
                    <p className={`font-semibold ${availableCapacity < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {availableCapacity.toFixed(2)} gal
                    </p>
                  </div>
                </div>
                {availableCapacity < 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      La cantidad solicitada excede la capacidad disponible del camión.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fuel Information Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-600" />
              Información de Combustible
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Tipo de Combustible *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {FUEL_TYPES.map((fuel) => (
                  <button
                    key={fuel.value}
                    type="button"
                    onClick={() => handleInputChange("fuelType", fuel.value)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.fuelType === fuel.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Badge className={fuel.color}>
                      {fuel.label}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {formData.fuelType === "CUSTOM" && (
              <div className="space-y-2">
                <Label htmlFor="customFuelType">Tipo Personalizado *</Label>
                <Input
                  id="customFuelType"
                  value={formData.customFuelType}
                  onChange={(e) => handleInputChange("customFuelType", e.target.value)}
                  placeholder="Especificar tipo de combustible"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalQuantity">Cantidad Total (Galones) *</Label>
                <Input
                  id="totalQuantity"
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedTruck ? selectedTruck.capacitygal.toString() : undefined}
                  value={formData.totalQuantity}
                  onChange={(e) => handleInputChange("totalQuantity", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerGallon">Precio por Galón (S/)</Label>
                <Input
                  id="pricePerGallon"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.pricePerGallon}
                  onChange={(e) => handleInputChange("pricePerGallon", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Financial Calculator */}
            {formData.totalQuantity && formData.pricePerGallon && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-800">Cálculo Financiero</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Subtotal:</span>
                    <p className="font-semibold">S/ {subtotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">IGV (18%):</span>
                    <p className="font-semibold">S/ {igv.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <p className="font-bold text-green-600">S/ {total.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente *</Label>
              <Select value={formData.customerId} onValueChange={(value) => handleInputChange("customerId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      <div className="flex flex-col">
                        <span>{customer.companyname}</span>
                        <span className="text-xs text-gray-500">RUC: {customer.ruc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Location Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-red-600" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.locationMode === "GPS_AUTO"}
                onCheckedChange={(checked) => 
                  handleInputChange("locationMode", checked ? "GPS_AUTO" : "MANUAL_INPUT")
                }
              />
              <Label>Usar GPS automático</Label>
              {gpsLocation && (
                <Badge className="bg-green-100 text-green-800">
                  <Navigation className="h-3 w-3 mr-1" />
                  GPS Activo
                </Badge>
              )}
            </div>

            {formData.locationMode === "GPS_AUTO" ? (
              <div className="p-4 bg-blue-50 rounded-lg">
                {gpsLocation ? (
                  <div>
                    <p className="font-medium text-blue-800">Ubicación GPS Capturada</p>
                    <p className="text-sm text-blue-600">
                      Lat: {gpsLocation.lat.toFixed(6)}, Lng: {gpsLocation.lng.toFixed(6)}
                    </p>
                  </div>
                ) : (
                  <p className="text-blue-600">Obteniendo ubicación GPS...</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="manualLocation">Ubicación Manual *</Label>
                <Textarea
                  id="manualLocation"
                  value={formData.manualLocation}
                  onChange={(e) => handleInputChange("manualLocation", e.target.value)}
                  placeholder="Describir ubicación específica del despacho"
                  rows={3}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Photos Block */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-indigo-600" />
              Documentación Fotográfica
            </CardTitle>
            <CardDescription>
              Máximo 5MB por archivo. Formatos: JPG, PNG, PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PHOTO_TYPES.map((photoType) => (
              <div key={photoType.value} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    {photoType.label}
                    {photoType.required && <span className="text-red-500">*</span>}
                  </Label>
                  <Badge variant={photoType.required ? "default" : "outline"}>
                    {photos[photoType.value]?.length || 0} foto(s)
                  </Badge>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => handlePhotoUpload(photoType.value, e.target.files)}
                    className="hidden"
                    id={`photos-${photoType.value}`}
                  />
                  <label
                    htmlFor={`photos-${photoType.value}`}
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Camera className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      Hacer clic para agregar fotos
                    </span>
                  </label>
                  
                  {/* Photo previews */}
                  {photos[photoType.value] && photos[photoType.value]!.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {photos[photoType.value]!.map((file, index) => (
                        <div key={index} className="relative">
                          <div className="aspect-square bg-gray-100 rounded border flex items-center justify-center">
                            {file.type.startsWith('image/') ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={`${photoType.label} ${index + 1}`}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <FileText className="h-8 w-8 text-gray-400" />
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removePhoto(photoType.value, index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Information Block */}
        <Card>
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Fecha Programada *</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledTime">Hora Programada</Label>
                <Input
                  id="scheduledTime"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initialKm">Kilometraje Inicial</Label>
                <Input
                  id="initialKm"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.initialKm}
                  onChange={(e) => handleInputChange("initialKm", e.target.value)}
                  placeholder="0.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Instrucciones especiales, rutas, etc."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleInputChange("observations", e.target.value)}
                placeholder="Observaciones adicionales del despacho"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Auto-save toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoSaveEnabled}
                  onCheckedChange={setAutoSaveEnabled}
                />
                <Label>Auto-guardado cada 30 segundos</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={clearForm}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpiar Formulario
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              localStorage.setItem('petrus_dispatch_draft', JSON.stringify(formData))
              toast.success("Borrador guardado")
            }}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar Borrador
          </Button>
          
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando Despacho...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Crear Despacho
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}