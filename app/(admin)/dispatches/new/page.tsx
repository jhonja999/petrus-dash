"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { SimpleLocationPicker } from "@/components/SimpleLocationPicker"
import { useToast } from "@/hooks/use-toast"
import {
  Truck,
  MapPin,
  Camera,
  AlertTriangle,
  Clock,
  Fuel,
  User,
  Route,
  Save,
  Send,
  CheckCircle,
  RotateCcw,
  Factory,
} from "lucide-react"
import axios from "axios"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface DispatchFormData {
  truckId: string
  driverId: string
  customerId: string
  fuelType: string
  customFuelName: string
  quantity: number
  priority: "NORMAL" | "ALTA" | "URGENTE"
  scheduledDate: string
  scheduledTime: string
  deliveryAddress: string
  deliveryLatitude?: number
  deliveryLongitude?: number
  locationMethod?: string
  clientName: string
  clientRuc: string
  clientContact: string
  observations: string
  photos: any[]
  documents: any[]
}

interface Driver {
  id: number
  name: string
  lastname: string
  email: string
  dni: string
  role: string
  state: string
}

interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
}

interface LocationData {
  address: string
  latitude?: number
  longitude?: number
  method: "OFFICE_PLANNED" | "MANUAL" | "GPS" | "SEARCH_SELECTED"
  timestamp?: Date
}

interface Vehicle {
  id: number
  placa: string
  typefuel: string
  capacitygal: number
  currentLoad: number
  maxCapacity?: number
  state: string
}

const FUEL_TYPES = [
  { value: "DIESEL_B5", label: "Diesel B5" },
  { value: "DIESEL_B500", label: "Diesel B500" },
  { value: "GASOLINA_PREMIUM_95", label: "Gasolina Premium (95)" },
  { value: "GASOLINA_REGULAR_90", label: "Gasolina Regular (90)" },
  { value: "GASOHOL_84", label: "Gasohol 84" },
  { value: "GASOHOL_90", label: "Gasohol 90" },
  { value: "GASOHOL_95", label: "Gasohol 95" },
  { value: "SOLVENTE", label: "Solvente Industrial" },
  { value: "GASOL", label: "Gasol" },
  { value: "PERSONALIZADO", label: "Personalizado" },
]

const PRIORITY_CONFIG = {
  NORMAL: { label: "Normal", color: "bg-gray-100 text-gray-800", icon: Clock },
  ALTA: { label: "Alta", color: "bg-yellow-100 text-yellow-800", icon: AlertTriangle },
  URGENTE: { label: "Urgente", color: "bg-red-100 text-red-800", icon: AlertTriangle },
}

const TIME_SLOTS = [
  { value: "06:00", label: "06:00 - Madrugada" },
  { value: "08:00", label: "08:00 - Mañana" },
  { value: "10:00", label: "10:00 - Media Mañana" },
  { value: "12:00", label: "12:00 - Mediodía" },
  { value: "14:00", label: "14:00 - Tarde" },
  { value: "16:00", label: "16:00 - Media Tarde" },
  { value: "18:00", label: "18:00 - Noche" },
  { value: "20:00", label: "20:00 - Noche Tardía" },
]

export default function NewDispatchPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("basic")
  const [nextDispatchNumber, setNextDispatchNumber] = useState("")

  const [formData, setFormData] = useState<DispatchFormData>({
    truckId: "",
    driverId: "",
    customerId: "",
    fuelType: "",
    customFuelName: "",
    quantity: 0,
    priority: "NORMAL",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "",
    deliveryAddress: "",
    clientName: "",
    clientRuc: "",
    clientContact: "",
    observations: "",
    photos: [],
    documents: [],
  })

  // Ubicación de carga (Cajamarca por defecto)
  const [loadingLocationData, setLoadingLocationData] = useState<LocationData>({
    address: "Terminal de Combustibles Cajamarca, Av. Hoyos Rubio 1250, Cajamarca",
    latitude: -7.1619,
    longitude: -78.5151,
    method: "OFFICE_PLANNED",
  })

  // Ubicación de descarga
  const [deliveryLocationData, setDeliveryLocationData] = useState<LocationData>({
    address: "",
    method: "OFFICE_PLANNED",
  })

  const [isDeliveryLocationConfirmed, setIsDeliveryLocationConfirmed] = useState(false)

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])

  // Load initial data and next dispatch number
  useEffect(() => {
    const loadData = async () => {
      try {
        const [vehiclesRes, driversRes, customersRes, nextDispatchNumRes] = await Promise.all([
          axios.get("/api/trucks"),
          axios.get("/api/users"),
          axios.get("/api/customers"),
          axios.get("/api/dispatches/next-number"),
        ])

        setVehicles(vehiclesRes.data.filter((v: Vehicle) => v.state === "Activo"))
        setDrivers(driversRes.data.filter((d: Driver) => d.role === "OPERADOR" && d.state === "Activo"))
        setCustomers(customersRes.data)
        setNextDispatchNumber(nextDispatchNumRes.data.data)
      } catch (error) {
        console.error("Error loading data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos iniciales",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [toast])

  const updateFormData = (field: keyof DispatchFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleLoadingLocationChange = (location: LocationData) => {
    setLoadingLocationData(location)
  }

  const handleDeliveryLocationChange = (location: LocationData) => {
    if (!isDeliveryLocationConfirmed) {
      setDeliveryLocationData(location)
      updateFormData("deliveryAddress", location.address)

      if (location.latitude && location.longitude) {
        updateFormData("deliveryLatitude", location.latitude)
        updateFormData("deliveryLongitude", location.longitude)
      }

      // Mapear método de ubicación
      let mappedLocationMethod: string
      switch (location.method) {
        case "MANUAL":
          mappedLocationMethod = "MANUAL_INPUT"
          break
        case "GPS":
          mappedLocationMethod = "GPS_AUTO"
          break
        case "OFFICE_PLANNED":
          mappedLocationMethod = "OFFICE_PLANNED"
          break
        case "SEARCH_SELECTED":
          mappedLocationMethod = "SEARCH_SELECTED"
          break
        default:
          mappedLocationMethod = "OFFICE_PLANNED"
      }
      updateFormData("locationMethod", mappedLocationMethod)
    }
  }

  const confirmDeliveryLocation = () => {
    if (deliveryLocationData.address) {
      setIsDeliveryLocationConfirmed(true)
      toast({
        title: "Ubicación confirmada",
        description: "La ubicación de entrega ha sido confirmada",
      })
    } else {
      toast({
        title: "Error",
        description: "Debe seleccionar una ubicación antes de confirmar",
        variant: "destructive",
      })
    }
  }

  const changeDeliveryLocation = () => {
    setIsDeliveryLocationConfirmed(false)
    toast({
      title: "Ubicación desbloqueada",
      description: "Ahora puede cambiar la ubicación de entrega",
    })
  }

  const handleSubmit = async (isDraft = false) => {
    setIsLoading(true)
    try {
      // Validation
      if (!formData.truckId || !formData.driverId || !formData.customerId || !formData.fuelType || !formData.quantity) {
        toast({
          title: "Error de validación",
          description: "Por favor complete todos los campos obligatorios",
          variant: "destructive",
        })
        return
      }

      if (formData.fuelType === "PERSONALIZADO" && !formData.customFuelName) {
        toast({
          title: "Error de validación",
          description: "Debe especificar el nombre del combustible personalizado",
          variant: "destructive",
        })
        return
      }

      if (!isDeliveryLocationConfirmed) {
        toast({
          title: "Error de validación",
          description: "Debe confirmar la ubicación de entrega antes de crear el despacho",
          variant: "destructive",
        })
        return
      }

      // Prepare request data
      const requestData = {
        truckId: Number.parseInt(formData.truckId),
        driverId: Number.parseInt(formData.driverId),
        customerId: Number.parseInt(formData.customerId),
        fuelType: formData.fuelType,
        customFuelName: formData.fuelType === "PERSONALIZADO" ? formData.customFuelName : undefined,
        quantity: formData.quantity,
        priority: formData.priority,
        scheduledDate: new Date(`${formData.scheduledDate}T${formData.scheduledTime || "08:00"}:00`).toISOString(),
        address: deliveryLocationData.address,
        locationGPS: deliveryLocationData.latitude && deliveryLocationData.longitude
          ? `${deliveryLocationData.latitude},${deliveryLocationData.longitude}`
          : undefined,
        locationMethod: formData.locationMethod,
        notes: formData.observations,
        photos: formData.photos.map((file) => ({
          public_id: file.public_id,
          secure_url: file.secure_url,
          original_filename: file.original_filename,
        })),
        status: isDraft ? "BORRADOR" : "PROGRAMADO",
        loadingLocation: {
          address: loadingLocationData.address,
          latitude: loadingLocationData.latitude,
          longitude: loadingLocationData.longitude,
        },
      }

      const response = await axios.post("/api/dispatches", requestData)

      if (response.data.success) {
        toast({
          title: isDraft ? "Borrador guardado" : "Despacho creado",
          description: `Despacho ${response.data.data.dispatchNumber} ${isDraft ? "guardado como borrador" : "creado exitosamente"}`,
        })
        router.push("/dispatches")
      }
    } catch (error: any) {
      console.error("Error creating dispatch:", error)
      toast({
        title: "Error",
        description: error.response?.data?.error || "No se pudo crear el despacho. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      truckId: "",
      driverId: "",
      customerId: "",
      fuelType: "",
      customFuelName: "",
      quantity: 0,
      priority: "NORMAL",
      scheduledDate: new Date().toISOString().split("T")[0],
      scheduledTime: "",
      deliveryAddress: "",
      clientName: "",
      clientRuc: "",
      clientContact: "",
      observations: "",
      photos: [],
      documents: [],
    })
    setDeliveryLocationData({
      address: "",
      method: "OFFICE_PLANNED",
    })
    setIsDeliveryLocationConfirmed(false)

    // Re-fetch the next dispatch number after reset
    axios.get("/api/dispatches/next-number").then((response) => {
      setNextDispatchNumber(response.data.data)
    })
  }

  const selectedVehicle = vehicles.find((v) => v.id === Number.parseInt(formData.truckId))
  const selectedDriver = drivers.find((d) => d.id === Number.parseInt(formData.driverId))
  const selectedCustomer = customers.find((c) => c.id === Number.parseInt(formData.customerId))
  const priorityConfig = PRIORITY_CONFIG[formData.priority]

  const availableCapacity = selectedVehicle
    ? (selectedVehicle.maxCapacity || selectedVehicle.capacitygal) - selectedVehicle.currentLoad
    : 0

  const isFormValid =
    formData.truckId &&
    formData.driverId &&
    formData.customerId &&
    formData.fuelType &&
    formData.quantity > 0 &&
    deliveryLocationData.address &&
    isDeliveryLocationConfirmed

  const calculateDistanceFromCajamarca = (lat: number, lng: number): number => {
    const R = 6371 // Radio de la Tierra en km
    const cajamarcaLat = -7.1619
    const cajamarcaLng = -78.5151
    const dLat = toRadians(lat - cajamarcaLat)
    const dLng = toRadians(lng - cajamarcaLng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(cajamarcaLat)) * Math.cos(toRadians(lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const toRadians = (degrees: number): number => degrees * (Math.PI / 180)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Despacho de Combustible</h1>
          <p className="text-gray-600 mt-1">Crear nuevo despacho programado - Sistema Petrus Cajamarca</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-lg font-mono px-4 py-2">
            {nextDispatchNumber}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="flex items-center space-x-2">
                <Truck className="h-4 w-4" />
                <span>Información Básica</span>
              </TabsTrigger>
              <TabsTrigger value="location" className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Ubicación</span>
              </TabsTrigger>
              <TabsTrigger value="schedule" className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Programación</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center space-x-2">
                <Camera className="h-4 w-4" />
                <span>Documentos</span>
              </TabsTrigger>
            </TabsList>

            {/* Basic Information Tab */}
            <TabsContent value="basic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Truck className="h-5 w-5" />
                    <span>Información del Vehículo</span>
                  </CardTitle>
                  <CardDescription>Seleccione el camión y conductor para el despacho</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="truck">Placa del Camión *</Label>
                      <Select value={formData.truckId} onValueChange={(value) => updateFormData("truckId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una placa" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span className="font-medium">{vehicle.placa}</span>
                                <Badge variant="secondary" className="ml-2">
                                  {vehicle.capacitygal} gal
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="driver">Conductor Asignado *</Label>
                      <Select value={formData.driverId} onValueChange={(value) => updateFormData("driverId", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione conductor" />
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
                    </div>
                  </div>

                  {selectedVehicle && (
                    <Alert>
                      <Truck className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div>
                            <strong>Capacidad total:</strong> {selectedVehicle.capacitygal} galones
                          </div>
                          <div>
                            <strong>Carga actual:</strong> {selectedVehicle.currentLoad} galones
                          </div>
                          <div>
                            <strong>Disponible:</strong> {availableCapacity} galones
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{
                                  width: `${(selectedVehicle.currentLoad / selectedVehicle.capacitygal) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Fuel className="h-5 w-5" />
                    <span>Tipo y Cantidad de Combustible</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fuelType">Tipo de Combustible *</Label>
                      <Select value={formData.fuelType} onValueChange={(value) => updateFormData("fuelType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {FUEL_TYPES.map((fuel) => (
                            <SelectItem key={fuel.value} value={fuel.value}>
                              {fuel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Cantidad (Galones) *</Label>
                      <Input
                        id="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        max={availableCapacity}
                        value={formData.quantity || ""}
                        onChange={(e) => updateFormData("quantity", Number.parseFloat(e.target.value) || 0)}
                        placeholder="Ej: 1000"
                      />
                      {selectedVehicle && formData.quantity > 0 && (
                        <p className="text-xs text-gray-600">
                          {formData.quantity > availableCapacity
                            ? `⚠️ Excede capacidad disponible (${availableCapacity} gal)`
                            : `✅ Dentro de capacidad disponible (${availableCapacity} gal)`}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">Prioridad</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value: any) => updateFormData("priority", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([key, config]) => {
                            const Icon = config.icon
                            return (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center space-x-2">
                                  <Icon className="h-4 w-4 mr-1" />
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.fuelType === "PERSONALIZADO" && (
                    <div className="space-y-2">
                      <Label htmlFor="customFuelName">Especificar Combustible *</Label>
                      <Input
                        id="customFuelName"
                        placeholder="Ej: Kerosene, JP-1, Combustible especial..."
                        value={formData.customFuelName}
                        onChange={(e) => updateFormData("customFuelName", e.target.value)}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Información del Cliente</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Cliente *</Label>
                    <Select
                      value={formData.customerId}
                      onValueChange={(value) => {
                        updateFormData("customerId", value)
                        const customer = customers.find((c) => c.id === Number.parseInt(value))
                        if (customer) {
                          updateFormData("clientName", customer.companyname)
                          updateFormData("clientRuc", customer.ruc)
                          updateFormData("clientContact", customer.address)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Buscar cliente por nombre o RUC" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{customer.companyname}</span>
                              <span className="text-sm text-gray-500">RUC: {customer.ruc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomer && (
                    <Alert>
                      <User className="h-4 w-4" />
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
            </TabsContent>

            {/* Location Tab */}
            <TabsContent value="location" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Planificación de Ruta - Cajamarca</span>
                  </CardTitle>
                  <CardDescription>Configure los puntos de carga y descarga para el despacho en Cajamarca</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Punto de Carga */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Factory className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-medium">Punto de Carga</h3>
                      <Badge variant="outline">Origen</Badge>
                    </div>

                    <SimpleLocationPicker
                      value={loadingLocationData}
                      onChange={handleLoadingLocationChange}
                      label="Ubicación de Carga"
                      locationType="carga"
                      isOfficeMode={true}
                    />
                  </div>

                  <Separator />

                  {/* Punto de Descarga */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-green-600" />
                      <h3 className="text-lg font-medium">Punto de Descarga</h3>
                      <Badge variant="outline">Destino</Badge>
                      {isDeliveryLocationConfirmed && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmado
                        </Badge>
                      )}
                    </div>

                    <SimpleLocationPicker
                      value={deliveryLocationData}
                      onChange={handleDeliveryLocationChange}
                      label="Ubicación de Entrega"
                      locationType="descarga"
                      required={true}
                      isOfficeMode={true}
                    />

                    {/* Botones de confirmación */}
                    <div className="flex gap-2">
                      {!isDeliveryLocationConfirmed ? (
                        <Button
                          onClick={confirmDeliveryLocation}
                          disabled={!deliveryLocationData.address}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirmar Ubicación de Entrega
                        </Button>
                      ) : (
                        <Button onClick={changeDeliveryLocation} variant="outline" className="flex-1 bg-transparent">
                          <MapPin className="h-4 w-4 mr-2" />
                          Cambiar Ubicación de Entrega
                        </Button>
                      )}
                    </div>

                    {isDeliveryLocationConfirmed && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Ubicación confirmada:</strong> {deliveryLocationData.address}
                          <br />
                          La ubicación está bloqueada para evitar cambios accidentales.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Información de Ruta */}
                  {deliveryLocationData.latitude && deliveryLocationData.longitude && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Route className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium text-green-800">Información de Ruta</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center p-3 bg-white rounded border">
                          <div className="text-lg font-bold text-blue-600">
                            {Math.round(
                              calculateDistanceFromCajamarca(
                                deliveryLocationData.latitude,
                                deliveryLocationData.longitude,
                              ),
                            )}{" "}
                            km
                          </div>
                          <div className="text-gray-600">Distancia desde terminal</div>
                        </div>

                        <div className="text-center p-3 bg-white rounded border">
                          <div className="text-lg font-bold text-green-600">
                            {Math.round(
                              calculateDistanceFromCajamarca(
                                deliveryLocationData.latitude,
                                deliveryLocationData.longitude,
                              ) / 30,
                            )}{" "}
                            hrs
                          </div>
                          <div className="text-gray-600">Tiempo estimado</div>
                        </div>

                        <div className="text-center p-3 bg-white rounded border">
                          <div className="text-lg font-bold text-purple-600">
                            {selectedVehicle ? Math.round(formData.quantity / 200) : 0} L
                          </div>
                          <div className="text-gray-600">Consumo estimado</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Estado y Programación</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="text-sm font-medium text-blue-900">Programado</div>
                      <div className="text-xs text-blue-600">Estado inicial</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Truck className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-500">Cargando</div>
                      <div className="text-xs text-gray-400">En proceso</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Route className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-500">En Ruta</div>
                      <div className="text-xs text-gray-400">Hacia destino</div>
                    </div>

                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200 opacity-50">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="text-sm font-medium text-gray-500">Completado</div>
                      <div className="text-xs text-gray-400">Finalizado</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="scheduledDate">Fecha Programada *</Label>
                      <Input
                        id="scheduledDate"
                        type="date"
                        value={formData.scheduledDate}
                        onChange={(e) => updateFormData("scheduledDate", e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduledTime">Hora Programada</Label>
                      <Select
                        value={formData.scheduledTime}
                        onValueChange={(value) => updateFormData("scheduledTime", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar hora" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              {slot.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      El despacho se creará con estado <Badge variant="secondary">PROGRAMADO</Badge>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observaciones y Notas Especiales</Label>
                    <Textarea
                      id="observations"
                      value={formData.observations}
                      onChange={(e) => updateFormData("observations", e.target.value)}
                      placeholder="Instrucciones especiales, contactos de emergencia, restricciones de horario, etc."
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Camera className="h-5 w-5" />
                    <span>Documentos y Fotografías</span>
                  </CardTitle>
                  <CardDescription>
                    Adjunte documentos relevantes para el despacho (opcionales en esta etapa)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <strong>Nota:</strong> Las fotos obligatorias (inicio de carga, entrega, conformidad) serán
                      tomadas por el conductor durante el proceso de despacho usando la aplicación móvil.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen del Despacho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedVehicle && (
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{selectedVehicle.placa}</div>
                  <div className="text-sm text-gray-600">Camión seleccionado</div>
                </div>
              )}

              {formData.quantity > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formData.quantity.toLocaleString()}</div>
                  <div className="text-sm text-gray-600">Galones a despachar</div>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Estado</span>
                  <Badge variant="outline">Programado</Badge>
                </div>
                {selectedDriver && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Conductor</span>
                    <span className="font-medium text-right">
                      {selectedDriver.name} {selectedDriver.lastname}
                    </span>
                  </div>
                )}
                {selectedCustomer && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cliente</span>
                    <span className="font-medium text-right truncate">{selectedCustomer.companyname}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ubicación</span>
                  <span
                    className={`font-medium text-right ${isDeliveryLocationConfirmed ? "text-green-600" : "text-orange-600"}`}
                  >
                    {isDeliveryLocationConfirmed ? "Confirmada" : "Pendiente"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Badge */}
          {formData.priority && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Badge className={`${priorityConfig.color} text-sm px-3 py-1`}>
                    <priorityConfig.icon className="h-4 w-4 mr-1" />
                    Prioridad {priorityConfig.label}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Alert */}
          {!isFormValid && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {!isDeliveryLocationConfirmed
                  ? "Debe confirmar la ubicación de entrega antes de crear el despacho"
                  : "Complete todos los campos obligatorios para crear el despacho"}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isLoading || !isFormValid}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? "Creando..." : "Crear Despacho"}
            </Button>

            <Button
              onClick={() => handleSubmit(true)}
              variant="outline"
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar Borrador
            </Button>

            <Button onClick={handleReset} variant="ghost" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpiar Formulario
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}