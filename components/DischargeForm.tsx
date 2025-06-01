"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import axios from "axios"
import type { Customer } from "@/types/globals"

interface DischargeFormProps {
  assignmentId: number
  customers: Customer[]
  onSuccess?: () => void
}

export function DischargeForm({ assignmentId, customers, onSuccess }: DischargeFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customerId: "",
    totalDischarged: "",
    marcadorInicial: "",
    marcadorFinal: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const cantidadReal =
        formData.marcadorInicial && formData.marcadorFinal
          ? Number.parseFloat(formData.marcadorInicial) - Number.parseFloat(formData.marcadorFinal)
          : undefined

      await axios.post("/api/discharges", {
        assignmentId,
        customerId: Number.parseInt(formData.customerId),
        totalDischarged: Number.parseFloat(formData.totalDischarged),
        marcadorInicial: formData.marcadorInicial ? Number.parseFloat(formData.marcadorInicial) : undefined,
        marcadorFinal: formData.marcadorFinal ? Number.parseFloat(formData.marcadorFinal) : undefined,
      })

      // Reset form
      setFormData({
        customerId: "",
        totalDischarged: "",
        marcadorInicial: "",
        marcadorFinal: "",
      })

      onSuccess?.()
    } catch (error) {
      console.error("Error creating discharge:", error)
      alert("Error al registrar la descarga")
    } finally {
      setLoading(false)
    }
  }

  const cantidadCalculada =
    formData.marcadorInicial && formData.marcadorFinal
      ? Number.parseFloat(formData.marcadorInicial) - Number.parseFloat(formData.marcadorFinal)
      : 0

  const totalDischarged = Number.parseFloat(formData.totalDischarged) || 0
  const diferencia = Math.abs(cantidadCalculada - totalDischarged)
  const tolerancia = totalDischarged * 0.02 // 2% tolerance
  const fueraDeToleranacia = diferencia > tolerancia && totalDischarged > 0 && cantidadCalculada > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Descarga</CardTitle>
        <CardDescription>Registrar descarga de combustible a cliente</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, customerId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.companyname} - {customer.ruc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDischarged">Galones a Descargar</Label>
              <Input
                id="totalDischarged"
                type="number"
                step="0.01"
                value={formData.totalDischarged}
                onChange={(e) => setFormData((prev) => ({ ...prev, totalDischarged: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="marcadorInicial">Marcador Inicial</Label>
              <Input
                id="marcadorInicial"
                type="number"
                step="0.01"
                value={formData.marcadorInicial}
                onChange={(e) => setFormData((prev) => ({ ...prev, marcadorInicial: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="marcadorFinal">Marcador Final</Label>
              <Input
                id="marcadorFinal"
                type="number"
                step="0.01"
                value={formData.marcadorFinal}
                onChange={(e) => setFormData((prev) => ({ ...prev, marcadorFinal: e.target.value }))}
                placeholder="0.00"
              />
            </div>
          </div>

          {formData.marcadorInicial && formData.marcadorFinal && (
            <div className="space-y-2">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Cantidad calculada: <span className="font-bold">{cantidadCalculada.toFixed(2)} galones</span>
                </p>
                {formData.totalDischarged && (
                  <p className="text-xs text-blue-600 mt-1">Diferencia: {diferencia.toFixed(2)} galones</p>
                )}
              </div>

              {fueraDeToleranacia && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    La diferencia de {diferencia.toFixed(2)} galones excede la tolerancia del 2% (
                    {tolerancia.toFixed(2)} galones). Verifique los marcadores.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !formData.customerId || !formData.totalDischarged}
          >
            {loading ? "Registrando..." : "Registrar Descarga"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
