"use client" // Add "use client" directive

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Home, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth" // Import useAuth

export default function UnauthorizedPage() {
  const { logout } = useAuth() // Get the logout function

  const handleLogout = async () => {
    await logout() // Call the logout function
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-red-800">Acceso Denegado</CardTitle>
            <CardDescription className="text-red-600 mt-2">
              No tienes permisos para acceder a esta página
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p>Si crees que esto es un error, contacta con el administrador del sistema.</p>
          </div>

          <div className="space-y-2">
            <Button onClick={handleLogout} className="w-full" variant="destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Volver al Inicio
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
