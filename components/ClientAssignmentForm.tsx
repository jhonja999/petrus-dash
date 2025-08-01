"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Badge } from "./ui/badge"

interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
}

interface ClientAssignment {
  id: number
  customerId: number
  allocatedQuantity: number
  customer: Customer
}

interface ClientAssignmentFormProps {
  assignment: {
    id: number
    totalLoaded: number
    clientAssignments: ClientAssignment[]
  }
  customers: Customer[]
  onAssignmentUpdate: () => void
}

export function ClientAssignmentForm({
  assignment,
  customers,
  onAssignmentUpdate,
}: ClientAssignmentFormProps) {
  const { toast } = useToast()
  const [addingClient, setAddingClient] = useState(false)
  const [deletingClientId, setDeletingClientId] = useState<number | null>(null)
  const [newClientAssignment, setNewClientAssignment] = useState({
    customerId: "",
    allocatedQuantity: "",
  })

  const handleAddClientAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddingClient(true)

    try {
      const allocatedAmount = parseFloat(newClientAssignment.allocatedQuantity)
      const currentTotalAssigned = assignment.clientAssignments.reduce(
        (sum, ca) => sum + ca.allocatedQuantity,
        0
      )
      const remainingToAssign = assignment.totalLoaded - currentTotalAssigned

      if (allocatedAmount > remainingToAssign) {
        toast({
          title: "Error de validación",
          description: `No se puede asignar más de ${remainingToAssign.toFixed(2)} galones disponibles.`,
          variant: "destructive",
        })
        return
      }

      await axios.post(`/api/assignments/${assignment.id}/clients`, {
        customerId: parseInt(newClientAssignment.customerId),
        allocatedQuantity: allocatedAmount,
      })

      toast({
        title: "✅ Cliente asignado",
        description: "El cliente se ha asignado exitosamente.",
      })

      setNewClientAssignment({ customerId: "", allocatedQuantity: "" })
      onAssignmentUpdate()
    } catch (error: any) {
      console.error("Error adding client assignment:", error)
      toast({
        title: "❌ Error al asignar cliente",
        description: error.response?.data?.error || "No se pudo asignar el cliente.",
        variant: "destructive",
      })
    } finally {
      setAddingClient(false)
    }
  }

  const handleDeleteClientAssignment = async (clientAssignmentId: number) => {
    setDeletingClientId(clientAssignmentId)

    try {
      await axios.delete(`/api/assignments/${assignment.id}/clients/${clientAssignmentId}`)

      toast({
        title: "🗑️ Cliente eliminado",
        description: "El cliente ha sido eliminado de la asignación exitosamente.",
      })
      onAssignmentUpdate()
    } catch (error: any) {
      console.error("Error deleting client assignment:", error)
      toast({
        title: "❌ Error al eliminar cliente",
        description: error.response?.data?.error || "No se pudo eliminar la asignación de cliente.",
        variant: "destructive",
      })
    } finally {
      setDeletingClientId(null)
    }
  }

  const totalAssigned = assignment.clientAssignments.reduce(
    (sum, ca) => sum + ca.allocatedQuantity,
    0
  )
  const remainingToAssign = assignment.totalLoaded - totalAssigned

  return (
    <div>
      <div className="space-y-4">
        {assignment.clientAssignments.map((clientAssignment) => (
          <div
            key={clientAssignment.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div>
              <p className="font-semibold">{clientAssignment.customer.companyname}</p>
              <p className="text-sm text-gray-500">{clientAssignment.customer.ruc}</p>
              <Badge variant="outline">{clientAssignment.allocatedQuantity} gal</Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteClientAssignment(clientAssignment.id)}
              disabled={deletingClientId === clientAssignment.id}
            >
              {deletingClientId === clientAssignment.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAddClientAssignment} className="space-y-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customerId">Cliente</Label>
            <Select
              onValueChange={(value) =>
                setNewClientAssignment((prev) => ({ ...prev, customerId: value }))
              }
              value={newClientAssignment.customerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers
                  .filter(
                    (customer) =>
                      !assignment.clientAssignments.some(
                        (ca) => ca.customerId === customer.id
                      )
                  )
                  .map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.companyname}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="allocatedQuantity">Cantidad (Galones)</Label>
            <Input
              id="allocatedQuantity"
              type="number"
              step="0.01"
              min="0"
              max={remainingToAssign.toFixed(2)}
              value={newClientAssignment.allocatedQuantity}
              onChange={(e) =>
                setNewClientAssignment((prev) => ({
                  ...prev,
                  allocatedQuantity: e.target.value,
                }))
              }
              placeholder="0.00"
              disabled={!newClientAssignment.customerId}
            />
          </div>
        </div>
        <Button type="submit" disabled={addingClient || !newClientAssignment.customerId}>
          {addingClient ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Agregando...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cliente
            </>
          )}
        </Button>
      </form>
    </div>
  )
}