import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Home, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto p-4 bg-orange-100 rounded-full w-fit">
            <AlertTriangle className="h-12 w-12 text-orange-600" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">Página No Encontrada</CardTitle>
            <CardDescription className="text-gray-600 mt-2">
              La página que buscas no existe o ha sido movida
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p>Error 404 - Recurso no disponible</p>
          </div>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Ir al Inicio
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/auth/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Iniciar Sesión
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
