"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/shared/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Truck, User, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Driver {
  id: number
  name: string
  lastname: string
  dni: string
}

interface TruckData {
  id: number
  placa: string
  modelo: string
  capacidad: number
}

export default function NewAssignmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [trucks, setTrucks] = useState<TruckData[]>([])
  const [formData, setFormData] = useState({
    driverId: "",
    truckId: "",
    fuelType: "",
    totalLoaded: "",
    destination: "",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Mock data for now since API might not be ready
        setDrivers([
          { id: 1, name: "Juan", lastname: "Pérez", dni: "12345678" },
          { id: 2, name: "María", lastname: "García", dni: "87654321" },
          { id: 3, name: "Carlos", lastname: "López", dni: "11223344" },
        ])

        setTrucks([
          { id: 1, placa: "ABC-123", modelo: "Volvo FH", capacidad: 5000 },
          { id: 2, placa: "DEF-456", modelo: "Scania R450", capacidad: 4500 },
          { id: 3, placa: "GHI-789", modelo: "Mercedes Actros", capacidad: 6000 },
        ])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios.",
          variant: "destructive",
        })
      }
    }

    fetchData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Mock submission for now
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Asignación creada",
        description: "La asignación se ha creado exitosamente.",
      })

      router.push("/assignments")
    } catch (error) {
      console.error("Error creating assignment:", error)
      toast({
        title: "Error",
        description: "No se pudo crear la asignación. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/assignments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nueva Asignación</h1>
              <p className="text-gray-600">Crear una nueva asignación de combustible</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Detalles de la Asignación
            </CardTitle>
            <CardDescription>Complete todos los campos requeridos para crear la asignación</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Driver Selection */}
                <div className="space-y-2">
                  <Label htmlFor="driverId" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Conductor *
                  </Label>
                  <Select
                    value={formData.driverId}
                    onValueChange={(value) => handleInputChange("driverId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar conductor" />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name} {driver.lastname} - {driver.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Truck Selection */}
                <div className="space-y-2">
                  <Label htmlFor="truckId" className="flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Camión *
                  </Label>
                  <Select
                    value={formData.truckId}
                    onValueChange={(value) => handleInputChange("truckId", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar camión" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id.toString()}>
                          {truck.placa} - {truck.modelo} ({truck.capacidad}L)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fuel Type */}
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Tipo de Combustible *</Label>
                  <Select
                    value={formData.fuelType}
                    onValueChange={(value) => handleInputChange("fuelType", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Gasolina">Gasolina</SelectItem>
                      <SelectItem value="GLP">GLP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total Loaded */}
                <div className="space-y-2">
                  <Label htmlFor="totalLoaded">Cantidad Cargada (Galones) *</Label>
                  <Input
                    id="totalLoaded"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.totalLoaded}
                    onChange={(e) => handleInputChange("totalLoaded", e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* Destination */}
              <div className="space-y-2">
                <Label htmlFor="destination">Destino *</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                  placeholder="Dirección de destino"
                  required
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Instrucciones especiales o comentarios..."
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" asChild>
                  <Link href="/assignments">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Creando..." : "Crear Asignación"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
