import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Truck, Users, BarChart3, Building, Droplet, ArrowRight } from "lucide-react"
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs"

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-2xl">
            <Droplet className="h-7 w-7 text-emerald-600" />
            <span>Petrus</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignedOut>
                  <Button size="lg" asChild>
                    <SignInButton mode="modal">
                      <span>Iniciar Sesión</span>
                    </SignInButton>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <SignUpButton mode="modal">
                      <span>Registrarse</span>
                    </SignUpButton>
                  </Button>
                </SignedOut>
                <SignedIn>
                  <Button size="lg" asChild>
                    <Link href="/dashboard">
                      Ir al Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </SignedIn>
              </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-emerald-50 to-white">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-block px-4 py-1.5 mb-6 text-sm font-medium rounded-full bg-emerald-100 text-emerald-800">
                  Sistema de Gestión de Combustible
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900">
                  Gestión Inteligente de Combustible
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-lg">
                  Optimice sus operaciones de distribución de combustible con nuestra plataforma integral de gestión.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 px-6">
                    Solicitar Demo
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    Ver Características <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-8 flex items-center text-sm text-gray-500">
                  <span className="font-medium">Confiado por más de 100+ empresas</span>
                  <div className="ml-4 flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                      >
                        {i}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-video rounded-xl overflow-hidden shadow-2xl border border-gray-200">
                  <div className="absolute inset-0 bg-gray-900/20 flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full bg-white/90 shadow-lg flex items-center justify-center cursor-pointer hover:bg-white transition-colors">
                      <div className="h-12 w-12 rounded-full bg-emerald-600 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <img
                    src="/placeholder.svg?height=400&width=600"
                    alt="Petrus platform demo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -right-6 -z-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl"></div>
                <div className="absolute -top-6 -left-6 -z-10 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Solución Completa de Gestión de Despacho</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Nuestra plataforma integra todas las herramientas necesarias para optimizar su operación de distribución
                de combustible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
                  <Truck className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Gestión de Flota</h3>
                <p className="text-gray-600">
                  Seguimiento en tiempo real del estado de su flota, programación de mantenimiento y control de
                  combustible.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
                  <Users className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Asignación de Conductores</h3>
                <p className="text-gray-600">
                  Asigne conductores a camiones y gestione los horarios de entrega de combustible de manera eficiente.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
                  <Building className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Gestión de Clientes</h3>
                <p className="text-gray-600">
                  Mantenga un registro centralizado de todos sus clientes, ubicaciones e historiales de entrega.
                </p>
              </div>

              <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-300">
                <div className="h-14 w-14 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
                  <BarChart3 className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Reportes Avanzados</h3>
                <p className="text-gray-600">
                  Genere informes detallados sobre consumo de combustible, entregas y rendimiento de la flota.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-4">¿Listo para optimizar sus operaciones de despacho?</h2>
            <p className="text-xl opacity-90 mb-8">
              Únase a cientos de empresas que ya utilizan nuestra plataforma para gestionar su distribución de
              combustible.
            </p>
            <Button size="lg" variant="secondary" className="px-8 py-6 text-lg font-medium">
              Comenzar Hoy
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-xl mb-4">
                <Droplet className="h-6 w-6 text-emerald-400" />
                <span>Petrus</span>
              </div>
              <p className="text-gray-400">Soluciones integrales para la gestión y distribución de combustible.</p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Producto</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Integraciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Recursos</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Documentación
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Guías
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Soporte
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Empresa</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Acerca de
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Clientes
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Contacto
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Carreras
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 mb-4 md:mb-0">
              © {new Date().getFullYear()} Petrus. Todos los derechos reservados.
            </div>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                Términos
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                Privacidad
              </a>
              <a href="#" className="text-gray-400 hover:text-emerald-400 transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
