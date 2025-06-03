"use client"

import { TruckForm } from "@/components/TruckForm"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft } from "lucide-react"

export default function NewTruckPage() {
  const authResult = useAuth()
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  const isAdmin = authResult.isAdmin
  const isLoading = authResult.isLoading

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [mounted, isAdmin, isLoading, router])

  // Don't render anything until mounted on client
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nuevo Camión</h1>
              <p className="text-sm text-gray-600">Registra un nuevo vehículo en la flota</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild variant="outline">
                <Link href="/trucks">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a Camiones
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Información del Camión</h2>
            <p className="text-sm text-gray-600">Complete los datos del nuevo vehículo</p>
          </div>
          <div className="p-6">
            <TruckForm />
          </div>
        </div>
      </main>
    </div>
  )
}
