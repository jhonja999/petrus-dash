import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="mx-auto max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldAlert className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
          <CardDescription>No tienes permisos suficientes para acceder a esta sección.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>
            Si crees que deberías tener acceso, por favor contacta al administrador del sistema para verificar tus
            permisos.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/">Volver al Inicio</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
