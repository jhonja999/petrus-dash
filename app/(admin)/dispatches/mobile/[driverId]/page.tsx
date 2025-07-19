"use client"

import { use, useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { MobileDriverApp } from "@/components/MobileDriverApp"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ driverId: string }>
}

export default function MobileDriverPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const driverId = parseInt(resolvedParams.driverId)
  const { user, isAdmin, isOperator, isLoading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [driver, setDriver] = useState<any>(null)
  const [loadingDriver, setLoadingDriver] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading) {
      // Check authentication
      if (!user) {
        router.push("/login")
        return
      }

      // Check permissions: admin can access any driver, operator only their own
      if (!isAdmin && (!isOperator || user.id !== driverId)) {
        router.push("/unauthorized")
        return
      }

      fetchDriver()
    }
  }, [mounted, isLoading, user, isAdmin, isOperator, driverId, router])

  const fetchDriver = async () => {
    try {
      const response = await fetch(`/api/users/${driverId}`)
      if (!response.ok) throw new Error('Driver not found')
      
      const data = await response.json()
      if (data.success && data.data.role === 'Operador') {
        setDriver(data.data)
      } else {
        throw new Error('Invalid driver')
      }
    } catch (error) {
      console.error('Error fetching driver:', error)
      router.push("/unauthorized")
    } finally {
      setLoadingDriver(false)
    }
  }

  if (!mounted || isLoading || loadingDriver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando aplicación móvil...</p>
        </div>
      </div>
    )
  }

  if (!user || (!isAdmin && (!isOperator || user.id !== driverId))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600 mb-4">
              No tienes permisos para acceder a esta aplicación móvil.
            </p>
            <Button asChild>
              <Link href="/dashboard">Volver al Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Conductor No Encontrado</h2>
            <p className="text-gray-600 mb-4">
              El conductor solicitado no existe o no es válido.
            </p>
            <Button asChild>
              <Link href="/dispatches">Volver a Despachos</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <MobileDriverApp
      driverId={driver.id}
      driverName={`${driver.name} ${driver.lastname}`}
      driverEmail={driver.corporateEmail || driver.email}
    />
  )
}