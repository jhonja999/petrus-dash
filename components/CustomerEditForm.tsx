"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import type { Customer } from "@/types/globals"
import axios from "axios"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { MapPin } from "lucide-react"

interface CustomerEditFormProps {
  customer: Customer
}

interface CustomerFormData {
  companyname: string
  ruc: string
  address: string
  latitude: string
  longitude: string
}

interface CustomerFormErrors {
  companyname?: string
  ruc?: string
  address?: string
  latitude?: string
  longitude?: string
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const router = useRouter()
  // Inicializa formData con los valores actuales del cliente
  const [formData, setFormData] = useState<CustomerFormData>({
    companyname: customer.companyname || "",
    ruc: customer.ruc || "",
    address: customer.address || "",
    latitude: customer.latitude ? customer.latitude.toString() : "",
    longitude: customer.longitude ? customer.longitude.toString() : "",
  })
  // Guarda los datos originales para la detección de cambios y el botón de restablecer
  const [originalData, setOriginalData] = useState<CustomerFormData>({
    companyname: customer.companyname || "",
    ruc: customer.ruc || "",
    address: customer.address || "",
    latitude: customer.latitude ? customer.latitude.toString() : "",
    longitude: customer.longitude ? customer.longitude.toString() : "",
  })
  const [errors, setErrors] = useState<CustomerFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Ref para evitar que el useEffect se ejecute en el primer render del componente
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Si no es el montaje inicial o si el cliente cambia
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      // Actualizar formData y originalData si la prop customer cambia
      const newData = {
        companyname: customer.companyname || "",
        ruc: customer.ruc || "",
        address: customer.address || "",
        latitude: customer.latitude ? customer.latitude.toString() : "",
        longitude: customer.longitude ? customer.longitude.toString() : "",
      }
      setFormData(newData)
      setOriginalData(newData)
      setHasChanges(false)
    }
  }, [customer])

  useEffect(() => {
    // Compara formData con originalData para detectar cambios
    const changesDetected =
      formData.companyname !== originalData.companyname ||
      formData.ruc !== originalData.ruc ||
      formData.address !== originalData.address ||
      formData.latitude !== originalData.latitude ||
      formData.longitude !== originalData.longitude

    setHasChanges(changesDetected)
  }, [formData, originalData])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    // Limpiar el error del campo al cambiarlo
    if (errors[id as keyof CustomerFormErrors]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: CustomerFormErrors = {}

    if (!formData.companyname.trim()) {
      newErrors.companyname = "El nombre de la empresa es requerido."
    }

    if (!formData.ruc.trim()) {
      newErrors.ruc = "El RUC es requerido."
    } else if (!/^\d{11}$/.test(formData.ruc)) {
      newErrors.ruc = "El RUC debe tener 11 dígitos numéricos."
    }

    if (!formData.address.trim()) {
      newErrors.address = "La dirección es requerida."
    }

    // Validar coordenadas si se proporcionan
    if (formData.latitude && isNaN(Number(formData.latitude))) {
      newErrors.latitude = "La latitud debe ser un número válido."
    }

    if (formData.longitude && isNaN(Number(formData.longitude))) {
      newErrors.longitude = "La longitud debe ser un número válido."
    }

    // Validar rangos de coordenadas
    if (formData.latitude) {
      const lat = Number(formData.latitude)
      if (lat < -90 || lat > 90) {
        newErrors.latitude = "La latitud debe estar entre -90 y 90."
      }
    }

    if (formData.longitude) {
      const lng = Number(formData.longitude)
      if (lng < -180 || lng > 180) {
        newErrors.longitude = "La longitud debe estar entre -180 y 180."
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
        description: "Por favor, corrige los errores en el formulario.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        companyname: formData.companyname,
        ruc: formData.ruc,
        address: formData.address,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
      }

      const response = await axios.put(`/api/customers/${customer.id}`, payload)
      if (response.data.success) {
        setOriginalData(formData)
        setHasChanges(false)
        toast({
          title: "Éxito",
          description: "Cliente actualizado exitosamente.",
        })
        router.push("/customers")
      } else {
        throw new Error(response.data.error || "Error al actualizar el cliente.")
      }
    } catch (error: any) {
      console.error("Error updating customer:", error)
      toast({
        title: "Error",
        description: error.response?.data?.message || error.message || "Error al actualizar el cliente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData(originalData)
    setErrors({})
    setHasChanges(false)
    toast({
      title: "Formulario restablecido",
      description: "Los cambios no guardados han sido descartados.",
    })
  }

  const createdAtFormatted = customer.createdAt
    ? format(new Date(customer.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
    : "No disponible"
  const updatedAtFormatted = customer.updatedAt
    ? format(new Date(customer.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })
    : "No disponible"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="companyname">Nombre de la Empresa</Label>
          <Input
            id="companyname"
            value={formData.companyname}
            onChange={handleChange}
            placeholder="Empresa S.A.C."
            required
          />
          {errors.companyname && <p className="text-red-500 text-sm">{errors.companyname}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruc">RUC</Label>
          <Input
            id="ruc"
            value={formData.ruc}
            onChange={handleChange}
            placeholder="20123456789"
            maxLength={11}
            required
          />
          {errors.ruc && <p className="text-red-500 text-sm">{errors.ruc}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Av. Principal 123, Lima"
          required
        />
        {errors.address && <p className="text-red-500 text-sm">{errors.address}</p>}
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Ubicación (Opcional)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitud</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="-12.0464"
              className="font-mono"
            />
            {errors.latitude && <p className="text-red-500 text-sm">{errors.latitude}</p>}
            <p className="text-xs text-gray-500">Ejemplo: -12.0464 (Lima, Perú)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="longitude">Longitud</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="-77.0428"
              className="font-mono"
            />
            {errors.longitude && <p className="text-red-500 text-sm">{errors.longitude}</p>}
            <p className="text-xs text-gray-500">Ejemplo: -77.0428 (Lima, Perú)</p>
          </div>
        </div>

        {formData.latitude && formData.longitude && !errors.latitude && !errors.longitude && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-700">
              <strong>Coordenadas:</strong> {formData.latitude}, {formData.longitude}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Estas coordenadas se usarán para el tracking y ubicación del cliente en el mapa.
            </p>
          </div>
        )}
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
        <div>
          <p>
            <strong>ID del Cliente:</strong> {customer.id}
          </p>
          <p>
            <strong>Creado el:</strong> {createdAtFormatted}
          </p>
        </div>
        <div>
          <p>
            <strong>Última actualización:</strong> {updatedAtFormatted}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleReset} disabled={!hasChanges || isSubmitting}>
          Restablecer
        </Button>
        <Button type="submit" disabled={!hasChanges || isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  )
}
