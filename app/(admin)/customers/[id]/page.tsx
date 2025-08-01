"use client"
import { useState, useEffect, use } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import axios from "axios"
import DashboardLayout from "@/components/shared/DashboardLayout"
import { CustomerLocationMap } from "@/components/CustomerLocationMap"
import type { Customer } from "@/types/globals"
import { toast } from "@/components/ui/use-toast"
import { Edit, MapPin, Building2, Hash, MapPinIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CustomerDetailsPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const customerId = resolvedParams.id
  const { isAdmin, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isAuthLoading) {
      if (!isAdmin) {
        router.push("/unauthorized")
        return
      }

      const fetchCustomer = async () => {
        try {
          setLoading(true)
          setError(null)
          console.log(`Client: Fetching customer with ID: ${customerId}`)
          const response = await axios.get(`/api/customers/${customerId}`)
          if (response.status === 200 && response.data.success) {
            console.log("Client: Customer data fetched successfully:", response.data.data)
            setCustomer(response.data.data)
          } else {
            const errorMessage = response.data?.message || `HTTP error! status: ${response.status}`
            throw new Error(errorMessage)
          }
        } catch (err: any) {
          console.error("Client: Error fetching customer:", err)
          setError(err.message || "Error al cargar los datos del cliente.")
          toast({
            title: "Error",
            description: `No se pudo cargar el cliente: ${err.message || "Error desconocido"}`,
            variant: "destructive",
          })
        } finally {
          setLoading(false)
        }
      }

      fetchCustomer()
    }
  }, [customerId, isAdmin, isAuthLoading, router, mounted])

  if (!mounted || isAuthLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!isAdmin) {
    return null // Redirection handled by useEffect
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center">
          <h2 className="text-xl font-semibold text-red-600">Error al cargar el cliente</h2>
          <p className="text-gray-600">{error}</p>
          <Button onClick={() => router.back()} className="mt-4">
            Volver
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  if (!customer) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center">
          <h2 className="text-xl font-semibold text-gray-900">Cliente no encontrado</h2>
          <p className="text-gray-600">El cliente con ID {customerId} no existe.</p>
          <Button onClick={() => router.push("/customers")} className="mt-4">
            Volver a la lista de clientes
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const createdAtFormatted = customer.createdAt
    ? format(new Date(customer.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
    : "No disponible"
  
  const updatedAtFormatted = customer.updatedAt
    ? format(new Date(customer.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })
    : "No disponible"

  const hasLocation = customer.latitude && customer.longitude

  return (
    <DashboardLayout>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Detalles del Cliente</h1>
              <p className="text-sm text-gray-600">Información completa del cliente</p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={`/customers/${customerId}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/customers">Volver</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información del cliente */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Información de la Empresa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{customer.companyname}</h3>
                  <p className="text-sm text-gray-600">Nombre de la empresa</p>
                </div>

                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.ruc}</p>
                    <p className="text-sm text-gray-600">RUC</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">{customer.address}</p>
                    <p className="text-sm text-gray-600">Dirección</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    {hasLocation ? (
                      <Badge className="bg-green-100 text-green-800">
                        Ubicación configurada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        Sin ubicación
                      </Badge>
                    )}
                    <p className="text-sm text-gray-600">Estado de ubicación</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Información del Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">ID del Cliente:</span>
                  <span className="text-sm font-medium">{customer.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Creado el:</span>
                  <span className="text-sm font-medium">{createdAtFormatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Última actualización:</span>
                  <span className="text-sm font-medium">{updatedAtFormatted}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mapa de ubicación */}
          <div>
            <CustomerLocationMap
              latitude={customer.latitude}
              longitude={customer.longitude}
              address={customer.address}
              companyName={customer.companyname}
            />
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
} 