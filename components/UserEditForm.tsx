"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Save, Undo2, User } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/useAuth"
import type { UserRole, UserState } from "@/types/globals"

interface UserEditFormProps {
  initialUser: {
    id: number
    name: string
    lastname: string
    email: string
    dni: string
    role: UserRole
    state: UserState
    createdAt: Date
    updatedAt: Date
  }
}

interface UserFormErrors {
  name?: string
  lastname?: string
  email?: string
  dni?: string
  role?: string
  state?: string
  password?: string
}

export default function UserEditForm({ initialUser }: UserEditFormProps) {
  const router = useRouter()
  const { isSuperAdmin } = useAuth()

  const [formData, setFormData] = useState({
    name: initialUser.name || "",
    lastname: initialUser.lastname || "",
    email: initialUser.email || "",
    dni: initialUser.dni || "",
    role: initialUser.role || "Operador",
    state: initialUser.state || "Activo",
    password: "", // Password is not pre-filled for security
  })
  const [originalData, setOriginalData] = useState(formData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<UserFormErrors>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Update form data if initialUser changes (e.g., after a successful save)
    setFormData({
      name: initialUser.name || "",
      lastname: initialUser.lastname || "",
      email: initialUser.email || "",
      dni: initialUser.dni || "",
      role: initialUser.role || "Operador",
      state: initialUser.state || "Activo",
      password: "",
    })
    setOriginalData({
      name: initialUser.name || "",
      lastname: initialUser.lastname || "",
      email: initialUser.email || "",
      dni: initialUser.dni || "",
      role: initialUser.role || "Operador",
      state: initialUser.state || "Activo",
      password: "",
    })
    setHasChanges(false)
    setErrors({})
  }, [initialUser])

  useEffect(() => {
    const changed =
      formData.name !== originalData.name ||
      formData.lastname !== originalData.lastname ||
      formData.email !== originalData.email ||
      formData.dni !== originalData.dni ||
      formData.role !== originalData.role ||
      formData.state !== originalData.state ||
      formData.password !== "" // Password field always indicates a change if not empty
    setHasChanges(changed)
  }, [formData, originalData])

  const validate = () => {
    const newErrors: UserFormErrors = {}
    if (!formData.name.trim()) newErrors.name = "El nombre es obligatorio."
    if (!formData.lastname.trim()) newErrors.lastname = "El apellido es obligatorio."
    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es obligatorio."
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Formato de correo electrónico inválido."
    }
    if (!formData.dni.trim()) {
      newErrors.dni = "El DNI es obligatorio."
    } else if (!/^\d{8}$/.test(formData.dni)) {
      newErrors.dni = "El DNI debe tener 8 dígitos numéricos."
    }
    if (!formData.role) newErrors.role = "El rol es obligatorio."
    if (!formData.state) newErrors.state = "El estado es obligatorio."

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value as UserRole | UserState }))
  }

  const handleReset = () => {
    setFormData(originalData)
    setErrors({})
    setHasChanges(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      toast({
        title: "Error de validación",
        description: "Por favor, corrige los errores en el formulario.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const dataToSend: any = { ...formData }
      // Remove password if it's empty, so it's not sent to the API for no change
      if (dataToSend.password === "") {
        delete dataToSend.password
      }

      const response = await axios.put(`/api/users/${initialUser.id}`, dataToSend)

      if (response.data.success) {
        toast({
          title: "Usuario actualizado",
          description: "El usuario ha sido actualizado exitosamente.",
        })
        // Update originalData to reflect the new saved state
        setOriginalData(formData)
        setHasChanges(false)
        // Optionally, refresh the user list or redirect
        router.push("/users")
      } else {
        toast({
          title: "Error al actualizar",
          description: response.data.message || "Hubo un problema al actualizar el usuario.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Error updating user:", err)
      toast({
        title: "Error de red",
        description: err.response?.data?.message || "No se pudo conectar con el servidor.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="h-5 w-5 mr-2" />
          Editar Usuario
        </CardTitle>
        <CardDescription>Actualiza la información del usuario {initialUser.name}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Juan" />
              {errors.name && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastname">Apellido</Label>
              <Input
                id="lastname"
                name="lastname"
                value={formData.lastname}
                onChange={handleInputChange}
                placeholder="Pérez"
              />
              {errors.lastname && (
                <p className="text-red-500 text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.lastname}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="juan.perez@ejemplo.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              name="dni"
              value={formData.dni}
              onChange={handleInputChange}
              placeholder="12345678"
              maxLength={8}
            />
            {errors.dni && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.dni}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operador">Operador (Conductor)</SelectItem>
                <SelectItem value="Admin">Administrador</SelectItem>
                {isSuperAdmin && <SelectItem value="S_A">Super Administrador</SelectItem>}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.role}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Select value={formData.state} onValueChange={(value) => handleSelectChange("state", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Suspendido">Suspendido</SelectItem>
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.state}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
            />
            <p className="text-sm text-gray-500">Deja en blanco para no cambiar la contraseña.</p>
            {errors.password && (
              <p className="text-red-500 text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleReset} disabled={!hasChanges || isSubmitting}>
              <Undo2 className="h-4 w-4 mr-2" />
              Restablecer
            </Button>
            <Button type="submit" disabled={!hasChanges || isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 text-sm text-gray-500 border-t pt-4">
          <p>**ID de Usuario:** {initialUser.id}</p>
          <p>
            **Creado el:** {initialUser.createdAt ? new Date(initialUser.createdAt).toLocaleString() : "No disponible"}
          </p>
          <p>
            **Última actualización:**{" "}
            {initialUser.updatedAt ? new Date(initialUser.updatedAt).toLocaleString() : "No disponible"}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
