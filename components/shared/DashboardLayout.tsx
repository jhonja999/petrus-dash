"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"
import {
  Menu,
  X,
  Home,
  Truck,
  Users,
  MapPin,
  Building2,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

   const navigation = [
    { name: "Panel", href: "/dashboard", icon: Home },
    { name: "Asignaciones", href: "/assignments", icon: MapPin },
    { name: "Camiones", href: "/trucks", icon: Truck },
    { name: "Clientes", href: "/customers", icon: Building2 },
    { name: "Usuarios", href: "/users", icon: Users },
    { name: "Reportes", href: "/reports", icon: BarChart3 },
  ]

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error("Error durante el cierre de sesión:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Botón de menú móvil */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Barra lateral */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-16",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Encabezado de la barra lateral */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {sidebarOpen && (
            <div className="flex items-center space-x-2">
              <Truck className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Petrus</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:flex">
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Información del usuario */}
        {user && (
          <div className="p-4 border-b border-gray-200">
            {sidebarOpen ? (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name} {user.lastname}
                  </p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {user.role === "S_A" ? "Super Administrador" : user.role}
                    </Badge>
                    <Badge variant={user.state === "Activo" ? "default" : "secondary"} className="text-xs">
                      {user.state}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navegación */}
        <nav className="mt-4 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors",
                  isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={cn("flex-shrink-0 h-5 w-5", sidebarOpen ? "mr-3" : "mx-auto")} />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Botón de cerrar sesión */}
        <div className="absolute bottom-4 left-2 right-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center text-gray-600 hover:text-gray-900 hover:bg-gray-50",
              !sidebarOpen && "justify-center",
            )}
          >
            <LogOut className={cn("h-5 w-5", sidebarOpen && "mr-3")} />
            {sidebarOpen && <span>Cerrar Sesión</span>}
          </Button>
        </div>
      </div>

      {/* Overlay móvil */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-600 bg-opacity-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Contenido principal */}
      <div className={cn("transition-all duration-300 ease-in-out", sidebarOpen ? "lg:ml-64" : "lg:ml-16")}>
        <main className="min-h-screen">
          <div className="p-4 lg:p-8 pt-16 lg:pt-8">{children}</div>
        </main>
      </div>

      {/* Toaster de Sonner */}
      <Toaster 
        position="top-right"
        richColors
        closeButton
        duration={4000}
        expand={true}
        visibleToasts={5}
      />
    </div>
  )
}