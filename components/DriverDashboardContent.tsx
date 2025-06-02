"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Truck, MapPin, Fuel, Clock, Calendar, Info, CheckCircle, AlertCircle } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/date"
import axios from "axios"
import type { Assignment, DailyAssignmentSummary } from "@/types/globals"

export default function DriverDashboardContent() {
  const { user, isConductor, isLoading } = useAuth()
  const router = useRouter()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DailyAssignmentSummary | null>(null)

  useEffect(() => {
    if (!isLoading && !isConductor) {
      router.push("/auth/unauthorized")
    }
  }, [isConductor, isLoading, router])

  useEffect(() => {
    const fetchTodayAssignments = async () => {
      if (!user?.id) return

      try {
        const today = new Date().toISOString().split("T")[0]
        const response = await axios.get(`/api/assignments?driverId=${user.id}&date=${today}`)
        const todayAssignments = response.data

        setAssignments(todayAssignments)

        // Calculate summary
        if (todayAssignments.length > 0) {
          const assignment = todayAssignments[0] // Should be only one per day
          const totalDischarges = assignment.discharges?.length || 0
          const completedDischarges = assignment.discharges?.filter((d: any) => d.status === "finalizado").length || 0
          const remainingFuel = assignment.totalRemaining
          const previousDayRemaining = assignment.truck?.lastRemaining || 0
          const totalAvailableFuel = Number(assignment.totalLoaded) + Number(previousDayRemaining)

          setSummary({
            assignment,
            totalDischarges,
            completedDischarges,
            remainingFuel,
            previousDayRemaining,
            totalAvailableFuel,
          })
        }
      } catch (error) {
        console.error("Error fetching assignments:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchTodayAssignments()
    }
  }, [user?.id])

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Cargando asignaciones...</p>
        </div>
      </div>
    )
  }

  if (!isConductor) {
    return null
  }

  const hasAssignments = assignments.length > 0
  const isCompleted = summary?.assignment?.isCompleted || false

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Truck className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Panel del Conductor</h1>
                <p className="text-sm text-gray-600">
                  {user?.name} {user?.lastname}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-blue-100 text-blue-800">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(new Date())}
              </Badge>
              <Button asChild variant="outline" size="sm">
                <a href="/api/auth/logout">Salir</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!hasAssignments ? (
          <Card className="text-center">
            <CardContent className="pt-6">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay asignaciones para hoy</h3>
              <p className="text-gray-600 mb-4">No tienes despachos programados para el día de hoy.</p>
              <p className="text-sm text-gray-500">Contacta con el administrador si esperabas una asignación.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Assignment Summary */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Truck className="h-6 w-6 text-blue-600" />
                      Asignación del Día
                    </CardTitle>
                    <CardDescription>
                      Camión: {summary?.assignment.truck.placa} - {summary?.assignment.fuelType}
                    </CardDescription>
                  </div>
                  <Badge className={isCompleted ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}>
                    {isCompleted ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Completado
                      </>
                    ) : (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        En Progreso
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Fuel Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Fuel className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Combustible Cargado</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">{summary?.assignment.totalLoaded.toString()} gal</p>
                  </div>

                  {Number(summary?.previousDayRemaining || 0) > 0 && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <span className="font-medium text-orange-900">Remanente Anterior</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-700">
                        {summary?.previousDayRemaining.toString()} gal
                      </p>
                    </div>
                  )}

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Fuel className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-900">Total Disponible</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">{summary?.totalAvailableFuel.toFixed(2)} gal</p>
                  </div>
                </div>

                {/* Progress Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Progreso de Descargas</span>
                    <span className="text-sm text-gray-600">
                      {summary?.completedDischarges} de {summary?.totalDischarges} completadas
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${summary?.totalDischarges ? (summary.completedDischarges / summary.totalDischarges) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Assignment Notes */}
                {summary?.assignment.notes && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Notas:</strong> {summary.assignment.notes}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Button */}
                <div className="pt-4">
                  <Button asChild className="w-full" size="lg">
                    <a href={`/despacho/${user?.id}/${summary?.assignment.id}`}>
                      <MapPin className="h-5 w-5 mr-2" />
                      Ver Detalles y Gestionar Descargas
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Información del Día
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hora de inicio:</span>
                    <span className="font-medium">{formatDateTime(summary?.assignment.createdAt || new Date())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de combustible:</span>
                    <Badge variant="outline">{summary?.assignment.fuelType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacidad del camión:</span>
                    <span className="font-medium">{summary?.assignment.truck.capacitygal.toString()} gal</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Fuel className="h-5 w-5 text-green-600" />
                    Estado del Combustible
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Combustible restante:</span>
                    <span className="font-bold text-green-600">{summary?.remainingFuel.toString()} gal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Combustible descargado:</span>
                    <span className="font-medium">
                      {(Number(summary?.totalAvailableFuel || 0) - Number(summary?.remainingFuel || 0)).toFixed(2)} gal
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Eficiencia:</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {summary?.totalAvailableFuel
                        ? (
                            ((Number(summary.totalAvailableFuel) - Number(summary.remainingFuel)) /
                              Number(summary.totalAvailableFuel)) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
