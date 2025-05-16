"use client"

import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import axios from "axios"
import { toast } from "react-toastify"
import ClientAssignmentForm from "@/components/features/assignment/client/ClientAssignmentForm"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/utils"

export default function AssignmentClientsPage() {
  const { id } = useParams()
  const [clients, setClients] = useState([])
  const [assignment, setAssignment] = useState(null)
  const [clientAssignments, setClientAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  // Obtener datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [clientsRes, assignmentRes, clientAssignmentsRes] = await Promise.all([
          axios.get("/api/customers"),
          axios.get(`/api/assignment/${id}`),
          axios.get(`/api/assignments/${id}/clients`),
        ])

        setClients(clientsRes.data)
        setAssignment(assignmentRes.data)

        // Combinar datos de clientes con asignaciones existentes
        const existingAssignments = clientAssignmentsRes.data
        const formattedAssignments = existingAssignments.map((item) => ({
          clientId: item.clientId,
          clientName: item.client.name,
          allocatedAmount: item.allocatedAmount,
          notes: item.notes || "",
        }))

        setClientAssignments(formattedAssignments)
      } catch (error) {
        console.error("Error cargando datos:", error)
        toast.error("Error al cargar datos iniciales")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSave = async (clientAssignments) => {
    try {
      await axios.post(`/api/assignments/${id}/clients`, {
        clientAssignments,
      })
      toast.success("Asignaciones a clientes guardadas correctamente")
    } catch (error) {
      console.error("Error guardando asignaciones:", error)
      toast.error(error.response?.data?.error || "Error al guardar asignaciones")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!assignment) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-lg text-gray-500">Asignación no encontrada</p>
      </div>
    )
  }

  // Calcular combustible disponible
  const totalDispatched = assignment.discharges?.reduce((sum, discharge) => sum + discharge.amount, 0) || 0

  const totalRemaining = assignment.fuelAmount - totalDispatched

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Asignación #{id} - Gestión de Clientes</h1>
        <div className="flex flex-wrap gap-2 text-sm text-gray-700">
          <Badge variant="outline" className="px-2 py-1">
            Camión: {assignment.truck?.placa}
          </Badge>
          <Badge variant="outline" className="px-2 py-1">
            Conductor: {assignment.driver?.name}
          </Badge>
          <Badge variant="outline" className="px-2 py-1 font-medium">
            Combustible disponible: {formatNumber(totalRemaining)} gal
          </Badge>
        </div>
      </div>

      <ClientAssignmentForm onSave={handleSave} clients={clients} initialData={clientAssignments} />
    </div>
  )
}
