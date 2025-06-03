"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { TruckEditForm } from "@/components/TruckEditForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Truck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"
import type { Truck as TruckType, ApiResponse } from "@/types/globals"

interface PageProps {
  params: Promise<{ id: string }>
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-32" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function EditTruckPage({ params }: PageProps) {
  // Unwrap params using React.use()
  const resolvedParams = use(params)
  const { user, isLoading: authLoading, isAdmin } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [truck, setTruck] = useState<TruckType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (!authLoading && user && !isAdmin) {
      toast({
        title: "Acceso denegado",
        description: "No tienes permisos para acceder a esta página",
        variant: "destructive",
      })
      router.push("/unauthorized")
      return
    }

    // Fetch truck data
    const fetchTruck = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/trucks/${resolvedParams.id}`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data: ApiResponse<TruckType> = await response.json()

        if (!data.success || !data.data) {
          setError(data.error || "No se pudo cargar la información del camión")
          toast({
            title: "Error",
            description: data.error || "No se pudo cargar la información del camión",
            variant: "destructive",
          })
          return
        }

        setTruck(data.data)
        setError(null)
      } catch (err) {
        console.error("Error fetching truck:", err)
        const errorMessage = err instanceof Error ? err.message : "Error al cargar la información del camión"
        setError(errorMessage)
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user && isAdmin) {
      fetchTruck()
    }
  }, [resolvedParams.id, authLoading, user, isAdmin, router, toast])

  // Show loading while auth is being checked
  if (authLoading) {
    return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Verificando autenticación...</span>
        </div>
    )
  }

  // Don't render anything if redirecting
  if (!user || !isAdmin) {
    return null
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/trucks">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Truck className="h-6 w-6" />
                Editar Camión
              </h1>
              {truck && <p className="text-gray-600">Modificar información del camión {truck.placa}</p>}
            </div>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Camión</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                <p>{error}</p>
                <Link href="/trucks">
                  <Button variant="outline" className="mt-4">
                    Volver a la lista de camiones
                  </Button>
                </Link>
              </div>
            ) : truck ? (
              <TruckEditForm truck={truck} />
            ) : (
              <div className="bg-destructive/10 p-4 rounded-md text-destructive">
                <p>No se encontró el camión solicitado</p>
                <Link href="/trucks">
                  <Button variant="outline" className="mt-4">
                    Volver a la lista de camiones
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
