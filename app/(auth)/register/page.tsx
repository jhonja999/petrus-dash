"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Truck, User, Mail, CreditCard, Shield, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import axios from "axios"

interface FormData {
  name: string
  lastname: string
  email: string
  dni: string
  role: "admin" | "conductor"
  state: "Activo" | "Inactivo" | "Suspendido"
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    lastname: "",
    email: "",
    dni: "",
    role: "conductor",
    state: "Activo",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setError(null)
  }

  const validateForm = (): boolean => {
    const { name, lastname, email, dni } = formData

    if (!name.trim() || !lastname.trim() || !email.trim() || !dni.trim()) {
      setError("Todos los campos son obligatorios")
      return false
    }

    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      setError("El DNI debe tener exactamente 8 dígitos numéricos")
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError("Por favor ingrese un correo electrónico válido")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    setError(null)

    try {
      const response = await axios.post("/api/auth/register", {
        ...formData,
        email: formData.email.toLowerCase().trim(),
        password: formData.dni, // DNI as initial password
      })

      if (response.data.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      }
    } catch (error: any) {
      let errorMessage = "Error al registrar usuario"

      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data.error || "Datos incompletos o inválidos"
            break
          case 409:
            errorMessage = "Usuario ya existe (email o DNI duplicado)"
            break
          case 500:
            errorMessage = "Error interno del servidor"
            break
          default:
            errorMessage = error.response.data?.error || "Ocurrió un error desconocido"
            break
        }
      } else if (error.request) {
        errorMessage = "No se pudo conectar con el servidor"
      } else {
        errorMessage = "Error al enviar la solicitud"
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto p-4 bg-green-100 rounded-full w-fit mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">¡Registro Exitoso!</h2>
            <p className="text-green-600 mb-4">Tu cuenta ha sido creada correctamente.</p>
            <p className="text-sm text-gray-600">Redirigiendo al inicio de sesión...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto p-4 bg-blue-100 rounded-full w-fit">
              <Truck className="h-12 w-12 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-3xl font-bold text-gray-900">Crear Cuenta</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Únete al Sistema de Gestión de Despachos de Combustible
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                  <User className="h-4 w-4" />
                  Información Personal
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombres *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      placeholder="Ingrese sus nombres"
                      disabled={loading}
                      className="h-12"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastname">Apellidos *</Label>
                    <Input
                      id="lastname"
                      type="text"
                      value={formData.lastname}
                      onChange={(e) => handleChange("lastname", e.target.value)}
                      placeholder="Ingrese sus apellidos"
                      disabled={loading}
                      className="h-12"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Correo Electrónico *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="usuario@empresa.com"
                    disabled={loading}
                    className="h-12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni" className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    DNI *
                  </Label>
                  <Input
                    id="dni"
                    type="text"
                    value={formData.dni}
                    onChange={(e) => handleChange("dni", e.target.value)}
                    placeholder="12345678"
                    disabled={loading}
                    className="h-12"
                    maxLength={8}
                    pattern="[0-9]{8}"
                    required
                  />
                  <p className="text-xs text-gray-500">El DNI será utilizado como contraseña inicial</p>
                </div>
              </div>

              {/* System Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 border-b pb-2">
                  <Shield className="h-4 w-4" />
                  Configuración del Sistema
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol en el Sistema</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: "admin" | "conductor") => handleChange("role", value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conductor">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Conductor
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Administrador
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado de la Cuenta</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value: "Activo" | "Inactivo" | "Suspendido") => handleChange("state", value)}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                        <SelectItem value="Suspendido">Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creando cuenta...
                  </div>
                ) : (
                  "Crear Cuenta"
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-gray-600">
                ¿Ya tienes una cuenta?{" "}
                <Link href="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
