"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { MobileDispatchCard } from "@/components/MobileDispatchCard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, RefreshCw, Smartphone } from "lucide-react"
import Link from "next/link"
import axios from "axios"
import { useAuth } from "@/contexts/AuthContext"
import { useToast } from "@/hooks/use-toast"

interface ExtendedAssignment {
  id: number
  driverId: number
  truckId: number
  fuelType: string
  totalLoaded: number | string
  totalRemaining: number | string
  isCompleted: boolean
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  notes?: string | null
  driver: {
    id: number
    name: string
    lastname: string
  }
  truck: {
    id: number
    placa: string
    capacidad: number
  }
  clientAssignments?: any[]
}

export default function MobileDispatchPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const driverId = params.driverId as string

  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
      return
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    fetchAssignments()
  }, [driverId])

  const fetchAssignments = async () => {
    try {
      setError(null)
      const response = await axios.get(`/api/assignments/active?driverId=${driverId}`)
      setAssignments(response.data)
    } catch (error) {
      console.error("Error fetching assignments:", error)
      setError("Error al cargar las asignaciones")
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    await fetchAssignments()
    toast({
      title: "Datos actualizados",
      description: "Las asignaciones han sido actualizadas",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando despachos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchAssignments}>Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/despacho/${driverId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="font-bold text-lg">Despachos Móvil</h1>
                <p className="text-sm text-gray-600">
                  {user?.name} {user?.lastname}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-blue-100 text-blue-800">
                <Smartphone className="h-3 w-3 mr-1" />
                Móvil
              </Badge>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Content */}
      <main className="p-4 space-y-4">
        {assignments.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay despachos activos</h3>
              <p className="text-gray-600 mb-4">No tienes asignaciones activas en este momento</p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>
        ) : (
          assignments.map((assignment) => (
            <MobileDispatchCard key={assignment.id} assignment={assignment} onUpdate={fetchAssignments} />
          ))
        )}
      </main>

      {/* Mobile Footer */}
      <footer className="bg-white border-t border-gray-200 p-4 text-center">
        <p className="text-xs text-gray-500">PETRUS SAC - Sistema de Despachos Móvil</p>
      </footer>
    </div>
  )
}
