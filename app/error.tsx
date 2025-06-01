"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-red-100 rounded-full w-fit">
            <AlertTriangle className="h-12 w-12 text-red-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-red-800">Error en la Aplicación</CardTitle>
            <CardDescription className="text-red-600 mt-2">Ha ocurrido un error inesperado</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p>Por favor, intenta recargar la página o contacta con soporte técnico.</p>
            {error.digest && <p className="text-xs text-gray-500 mt-2">ID del error: {error.digest}</p>}
          </div>

          <div className="space-y-2">
            <Button onClick={reset} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar de Nuevo
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
