"use client"
import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Truck, Fuel, Shield, ArrowRight, Users, BarChart3, CheckCircle, Zap } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  const { user, isLoading, isAuthenticated } = useAuth() // Added isAuthenticated
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      // Redirect based on role if authenticated
      if (user?.role === "admin") {
        router.replace("/admin/dashboard")
      } else if (user?.role === "conductor") {
        router.replace(`/despacho/${user.id}`)
      } else {
        // Fallback for other roles or if role is not yet determined
        router.replace("/auth/unauthorized")
      }
    }
  }, [user, isLoading, isAuthenticated, router, mounted])

  // Show loading state during SSR and initial mount
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated and not loading, show a redirecting message
  // This prevents the landing page from flashing before redirection
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Redirigiendo a tu panel...</p>
        </div>
      </div>
    )
  }

  // Render the landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Truck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Petrus</h1>
                <p className="text-xs text-gray-600">Sistema de Gestión</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button asChild variant="outline" className="hidden sm:flex">
                <Link href="/auth/register">Crear Cuenta</Link>
              </Button>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/auth/login">Iniciar Sesión</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="text-center py-16 lg:py-24">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200">
              <Zap className="h-3 w-3 mr-1" />
              Sistema Profesional de Despachos
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Gestión Inteligente de
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                Combustible
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Optimiza tu flota con nuestro sistema completo de gestión de despachos. Control total de camiones,
              conductores y operaciones diarias.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto"
              >
                <Link href="/auth/login" className="flex items-center gap-2">
                  Acceder al Sistema
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 h-auto border-2">
                <Link href="/auth/register">Crear Nueva Cuenta</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-blue-100 rounded-full w-fit mb-4 group-hover:bg-blue-200 transition-colors">
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Gestión de Flota</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed">
                Control completo de camiones, capacidades y estados en tiempo real con seguimiento de remanentes
                automático.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-green-100 rounded-full w-fit mb-4 group-hover:bg-green-200 transition-colors">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Control de Personal</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed">
                Gestión inteligente de conductores con asignaciones diarias únicas y seguimiento de actividades.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-orange-100 rounded-full w-fit mb-4 group-hover:bg-orange-200 transition-colors">
                <Fuel className="h-8 w-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl">Despachos Precisos</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed">
                Registro exacto de descargas con marcadores y control automático de remanentes entre días.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-purple-100 rounded-full w-fit mb-4 group-hover:bg-purple-200 transition-colors">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl">Reportes Avanzados</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed">
                Análisis detallado con métricas en tiempo real y reportes personalizables por período.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-indigo-100 rounded-full w-fit mb-4 group-hover:bg-indigo-200 transition-colors">
                <Shield className="h-8 w-8 text-indigo-600" />
              </div>
              <CardTitle className="text-xl">Seguridad Total</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed">
                Autenticación robusta con JWT y control de acceso basado en roles para máxima seguridad.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto p-4 bg-emerald-100 rounded-full w-fit mb-4 group-hover:bg-emerald-200 transition-colors">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <CardTitle className="text-xl">Validación Inteligente</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base leading-relaxed">
                Sistema de tolerancias automáticas y validación en tiempo real para operaciones sin errores.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        {/* CTA Section */}
        <div className="text-center py-16 mb-16">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-2xl">
            <CardContent className="py-12">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">¿Listo para optimizar tu operación?</h2>
              <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                Únete a las empresas que ya confían en nuestro sistema para gestionar sus flotas de manera eficiente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6 h-auto font-semibold"
                >
                  <Link href="/auth/login">Comenzar Ahora</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
                >
                  <Link href="/auth/register">Crear Cuenta Gratis</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Tech Stack */}
        <div className="text-center pb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Tecnología de Vanguardia</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { name: "Next.js 15", color: "bg-black text-white" },
              { name: "PostgreSQL", color: "bg-blue-600 text-white" },
              { name: "JWT Auth", color: "bg-orange-500 text-white" },
              { name: "TypeScript", color: "bg-blue-700 text-white" },
            ].map((tech) => (
              <div key={tech.name} className={`${tech.color} p-4 rounded-lg font-semibold`}>
                {tech.name}
              </div>
            ))}
          </div>
        </div>
      </main>
      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 Petrus. Sistema de Gestión de Despachos de Combustible.</p>
            <p className="text-sm mt-2">Desarrollado con Next.js 15, JWT Auth, PostgreSQL y TypeScript</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
