"use client"

import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import HomePageContent from "@/components/HomePageContent" // Importa el nuevo componente de contenido

export default function HomePageWrapper() {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated) {
      // Redirige basado en el rol si está autenticado
      if (user?.role === "admin") {
        router.replace("/admin/dashboard")
      } else if (user?.role === "conductor") {
        router.replace(`/despacho/${user.id}`)
      } else {
        // Fallback para otros roles o si el rol aún no está determinado
        router.replace("/auth/unauthorized")
      }
    }
  }, [user, isLoading, isAuthenticated, router, mounted])

  // Muestra estado de carga durante SSR y montaje inicial
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

  // Si el usuario está autenticado y no está cargando, muestra un mensaje de redirección
  // Esto evita que la página de aterrizaje parpadee antes de la redirección
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

  // Renderiza el contenido de la página de aterrizaje para usuarios no autenticados
  return <HomePageContent />
}
