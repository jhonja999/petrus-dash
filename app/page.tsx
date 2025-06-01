"use client"

import dynamic from "next/dynamic"

// Importa HomePage dinámicamente con SSR deshabilitado
const HomePage = dynamic(() => import("@/components/HomePage"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600 font-medium">Cargando página de inicio...</p>
    </div>
  ),
})

export default function RootPage() {
  return <HomePage />
}
