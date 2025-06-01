"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Truck, Mail, Lock, AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "react-toastify" // Import toast from react-toastify

// Create a hook that safely handles the auth context
function useSafeAuth() {
  const [authState, setAuthState] = useState<{
    login: ((email: string, password: string) => Promise<void>) | null
    isLoading: boolean
    isReady: boolean
  }>({
    login: null,
    isLoading: false,
    isReady: false,
  })

  // Dynamically import and use the auth hook only on client side
  useEffect(() => {
    const loadAuth = async () => {
      try {
        // Corrected import path for useAuth
        const { useAuth } = await import("@/hooks/useAuth")
        // This will only work if AuthProvider is available
        const auth = useAuth()
        setAuthState({
          login: auth.login,
          isLoading: auth.isLoading,
          isReady: true,
        })
      } catch (error) {
        console.error("Auth context not available:", error)
        setAuthState((prev) => ({ ...prev, isReady: true }))
      }
    }

    loadAuth()
  }, [])

  return authState
}

export default function LoginPage() {
  const { login, isLoading, isReady } = useSafeAuth()
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show loading until both mounted and auth is ready
  if (!mounted || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!login) {
      setError("Sistema de autenticación no disponible")
      toast.error("Sistema de autenticación no disponible")
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (!formData.email.trim() || !formData.password.trim()) {
        throw new Error("Por favor complete todos los campos")
      }

      await login(formData.email, formData.password)
      toast.success("Inicio de sesión exitoso")
    } catch (error: any) {
      const errorMessage = error.message || "Error al iniciar sesión"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 bg-blue-100 rounded-full w-fit">
              <Truck className="h-12 w-12 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">Sistema de Despachos</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Gestión integral de despachos de combustible
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="usuario@empresa.com"
                  disabled={loading || !login}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Contraseña
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Ingrese su contraseña"
                  disabled={loading || !login}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !login}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            <div className="text-center">
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
                ¿No tienes cuenta? Regístrate aquí
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
