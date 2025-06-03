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

interface CustomerEditFormProps {
  customer: Customer
}

interface CustomerFormData {
  companyname: string
  ruc: string
  address: string
}

interface CustomerFormErrors {
  companyname?: string
  ruc?: string
  address?: string
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const router = useRouter()
  // Inicializa formData con los valores actuales del cliente
  const [formData, setFormData] = useState<CustomerFormData>({
    companyname: customer.companyname || "", // Asegura que no sea null/undefined
    ruc: customer.ruc || "",
    address: customer.address || "",
  })
  // Guarda los datos originales para la detección de cambios y el botón de restablecer
  const [originalData, setOriginalData] = useState<CustomerFormData>({
    companyname: customer.companyname || "",
    ruc: customer.ruc || "",
    address: customer.address || "",
  })
  const [errors, setErrors] = useState<CustomerFormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Ref para evitar que el useEffect se ejecute en el primer render del componente
  // (cuando customer aún no está completamente cargado o cambia de null a un objeto)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // Si no es el montaje inicial o si el cliente cambia (por ejemplo, si se carga después de un loading)
    if (isInitialMount.current) {
      isInitialMount.current = false
    } else {
      // Actualizar formData y originalData si la prop customer cambia
      setFormData({
        companyname: customer.companyname || "",
        ruc: customer.ruc || "",
        address: customer.address || "",
      })
      setOriginalData({
        companyname: customer.companyname || "",
        ruc: customer.ruc || "",
        address: customer.address || "",
      })
      setHasChanges(false) // No hay cambios después de una nueva carga del cliente
    }
  }, [customer]) // Dependencia en el objeto customer completo

  useEffect(() => {
    // Compara formData con originalData para detectar cambios
    const changesDetected =
      formData.companyname !== originalData.companyname ||
      formData.ruc !== originalData.ruc ||
      formData.address !== originalData.address

    setHasChanges(changesDetected)
  }, [formData, originalData]) // Dependencia en formData y originalData para recalcular hasChanges

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
      const response = await axios.put(`/api/customers/${customer.id}`, formData)
      if (response.data.success) {
        setOriginalData(formData) // Actualizar originalData con los nuevos datos guardados
        setHasChanges(false)
        toast({
          title: "Éxito",
          description: "Cliente actualizado exitosamente.",
        })
        router.push("/customers") // Redirigir a la lista de clientes
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
            placeholder="Acme Corporation"
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
