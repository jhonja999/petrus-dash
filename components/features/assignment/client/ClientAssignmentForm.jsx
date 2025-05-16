"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "react-toastify"

export default function ClientAssignmentForm({ clients, onSave, initialData = [] }) {
  const [clientAssignments, setClientAssignments] = useState([])
  const [remainingFuel, setRemainingFuel] = useState(0)

  useEffect(() => {
    // Inicializar con datos existentes o crear nuevos
    if (initialData.length > 0) {
      setClientAssignments(initialData)
    } else {
      const initialAssignments = clients.map((client) => ({
        clientId: client.id,
        clientName: client.name,
        allocatedAmount: 0,
        notes: "",
      }))
      setClientAssignments(initialAssignments)
    }
  }, [clients, initialData])

  const handleAmountChange = (clientId, value) => {
    const numValue = Number.parseFloat(value) || 0

    setClientAssignments((prev) =>
      prev.map((item) => (item.clientId === clientId ? { ...item, allocatedAmount: numValue } : item)),
    )
  }

  const handleNotesChange = (clientId, value) => {
    setClientAssignments((prev) => prev.map((item) => (item.clientId === clientId ? { ...item, notes: value } : item)))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validar que no se exceda el combustible disponible
    const totalAllocated = clientAssignments.reduce((sum, item) => sum + item.allocatedAmount, 0)

    if (totalAllocated > remainingFuel) {
      toast.error("La cantidad total asignada excede el combustible disponible")
      return
    }

    // Filtrar solo clientes con asignación > 0
    const validAssignments = clientAssignments.filter((item) => item.allocatedAmount > 0)

    if (validAssignments.length === 0) {
      toast.error("Debe asignar combustible a al menos un cliente")
      return
    }

    onSave(validAssignments)
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Asignación de Combustible a Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clientAssignments.map((item) => (
              <div key={item.clientId} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-1">Cliente</label>
                  <div className="font-medium">{item.clientName}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cantidad (gal)</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.allocatedAmount}
                    onChange={(e) => handleAmountChange(item.clientId, e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notas</label>
                  <Textarea
                    value={item.notes}
                    onChange={(e) => handleNotesChange(item.clientId, e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
              Guardar Asignaciones
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
