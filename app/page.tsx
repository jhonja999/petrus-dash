"use client"

import { useEffect, useState } from "react"
import HomePageWrapper from "@/components/HomePageWrapper" // Importa directamente, pero se renderizará condicionalmente

export default function RootPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Renderiza un estado de carga simple durante SSR y la hidratación inicial del cliente
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 font-medium">Cargando página de inicio...</p>
      </div>
    )
  }

  // Solo renderiza HomePageWrapper en el cliente después de que el componente se haya montado
  return <HomePageWrapper />
}
