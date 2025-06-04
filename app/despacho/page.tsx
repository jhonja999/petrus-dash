"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Truck, Users, Settings } from "lucide-react"
import Link from "next/link"

export default function DespachoMainPage() {
  const { user, isLoading, isAuthenticated, isAdmin, isOperator } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      // Auto-redirect operators to their specific panel
      if (isOperator && user.role === "Operador") {
        console.log(`🔄 Auto-redirecting Operador ${user.id} to their panel`)
        router.push(`/despacho/${user.id}`)
      }
    }
  }, [isLoading, isAuthenticated, user, isOperator, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Acceso Requerido</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Necesitas iniciar sesión para acceder al sistema de despacho.</p>
            <Button asChild className="w-full">
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sistema de Despacho</h1>
                <p className="text-sm text-gray-600">Gestión de entregas y asignaciones</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.name} {user.lastname} ({user.role})
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Panel de Conductor - Solo para operadores */}
          {isOperator && (
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Mi Panel de Conductor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Accede a tus asignaciones y despachos del día</p>
                <Button asChild className="w-full">
                  <Link href={`/despacho/${user.id}`}>Ir a Mi Panel</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Panel Administrativo - Solo para admins */}
          {isAdmin && (
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-green-600" />
                  Panel Administrativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Supervisa todos los conductores y asignaciones</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/despacho/admin">Panel Admin</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Acceso a Conductores - Solo para admins */}
          {isAdmin && (
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Conductores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">Accede al panel de cualquier conductor</p>
                <div className="space-y-2">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/despacho/3">Conductor ID: 3</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/despacho/4">Conductor ID: 4</Link>
                  </Button>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href="/despacho/5">Conductor ID: 5</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Debug Info - Solo en desarrollo */}
        {process.env.NODE_ENV === "development" && (
          <Card className="mt-8 border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">Debug Info</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700">
              <p>
                <strong>Usuario:</strong> {user.name} {user.lastname}
              </p>
              <p>
                <strong>ID:</strong> {user.id}
              </p>
              <p>
                <strong>Rol:</strong> {user.role}
              </p>
              <p>
                <strong>Email:</strong> {user.email}
              </p>
              <p>
                <strong>Estado:</strong> {user.state}
              </p>
              <p>
                <strong>Es Admin:</strong> {isAdmin ? "Sí" : "No"}
              </p>
              <p>
                <strong>Es Operador:</strong> {isOperator ? "Sí" : "No"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
