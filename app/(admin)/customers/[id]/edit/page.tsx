"use client"
import { useState, useEffect, use } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"
import axios from "axios"
import DashboardLayout from "@/components/shared/DashboardLayout"
import { CustomerEditForm } from "@/components/CustomerEditForm"
import type { Customer } from "@/types/globals"
import { toast } from "@/components/ui/use-toast"
import { Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditCustomerPage({ params }: PageProps) {
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

  return (
    <DashboardLayout>
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Cliente</h1>
              <p className="text-sm text-gray-600">Modifica los datos del cliente existente</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/customers">Volver</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Edit className="h-5 w-5 mr-2" />
              Información del Cliente
            </CardTitle>
            <CardDescription>Actualiza los detalles del cliente.</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerEditForm customer={customer} />
          </CardContent>
        </Card>
      </main>
    </DashboardLayout>
  )
}
