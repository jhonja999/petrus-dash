"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { 
  Shield, 
  Home, 
  LogOut, 
  AlertTriangle, 
  User, 
  ArrowLeft,
  Lock,
  RefreshCw
} from "lucide-react"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user, logout, isLoading } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      // El contexto ya maneja la redirección a "/"
    } catch (error) {
      console.error("Error during logout:", error)
      // Fallback: redirect to logout API directly
      window.location.href = "/api/auth/logout"
    }
  }

  const handleGoHome = () => {
    router.push("/")
  }

  const handleTryAgain = () => {
    // Determinar a dónde debe ir basado en el rol
    if (user?.role === "Admin" || user?.role === "S_A") {
      router.push("/admin/dashboard")
    } else if (user?.role === "Operador") {
      router.push(`/despacho/${user.id}`)
    } else {
      router.push("/")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <Card className="border-red-200 shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              Acceso Denegado
            </CardTitle>
            <CardDescription className="text-lg text-gray-600 mt-2">
              No tienes los permisos necesarios para acceder a esta página
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* User Info */}
            {user && (
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {user.name} {user.lastname}
                      </p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                      <Badge variant="outline" className="mt-1">
                        {user.role === "Admin" ? "Administrador" : 
                         user.role === "S_A" ? "Super Admin" : 
                         user.role === "Operador" ? "Conductor" : user.role}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Details */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 mb-1">
                    Permisos Insuficientes
                  </h4>
                  <p className="text-sm text-red-700">
                    Tu cuenta no tiene los permisos necesarios para acceder a esta funcionalidad. 
                    Si crees que esto es un error, contacta con el administrador del sistema.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 gap-3">
              {user && (
                <Button 
                  onClick={handleTryAgain} 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Ir a Mi Panel
                </Button>
              )}
              
              <Button 
                onClick={handleGoHome} 
                variant="outline" 
                className="w-full"
                size="lg"
              >
                <Home className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Button>
              
              {user ? (
                <Button 
                  onClick={handleLogout} 
                  variant="destructive" 
                  className="w-full"
                  size="lg"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Cerrar Sesión
                </Button>
              ) : (
                <Button 
                  onClick={() => router.push("/auth/login")} 
                  variant="outline" 
                  className="w-full"
                  size="lg"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Iniciar Sesión
                </Button>
              )}
            </div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                ¿Necesitas ayuda? Contacta con el administrador del sistema
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}