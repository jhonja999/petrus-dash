"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { useApi } from "@/hooks/use-api"

const dischargeSchema = z.object({
  assignmentId: z.string().min(1, "Seleccione una asignación"),
  customerId: z.string().min(1, "Seleccione un cliente"),
  totalDischarged: z.coerce
    .number()
    .positive("La descarga debe ser mayor a 0")
    .max(10000, "La descarga máxima es 10,000 galones"),
  notes: z.string().optional(),
})

interface DischargeFormProps {
  discharge?: any
  onClose: () => void
}

export function DischargeForm({ discharge, onClose }: DischargeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!discharge
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)

  const { data: assignments, isLoading: assignmentsLoading } = useApi<any[]>("/api/assignments")
  const { data: customers, isLoading: customersLoading } = useApi<any[]>("/api/customers")

  const form = useForm<z.infer<typeof dischargeSchema>>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: {
      assignmentId: discharge?.assignmentId?.toString() || "",
      customerId: discharge?.customerId?.toString() || "",
      totalDischarged: discharge?.totalDischarged || "",
      notes: discharge?.notes || "",
    },
  })

  // When an assignment is selected, update the selected assignment
  useEffect(() => {
    const assignmentId = form.watch("assignmentId")
    if (assignmentId && assignments) {
      const selected = assignments.find((a) => a.id.toString() === assignmentId)
      setSelectedAssignment(selected)
    }
  }, [form.watch("assignmentId"), assignments, form])

  const onSubmit = async (data: z.infer<typeof dischargeSchema>) => {
    setIsSubmitting(true)
    try {
      const url = "/api/discharges"
      const method = isEditing ? "PATCH" : "POST"
      const body = isEditing ? { id: discharge.id, ...data } : data

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData || `Error ${response.status}: ${response.statusText}`)
      }

      toast({
        title: isEditing ? "Descarga actualizada" : "Descarga creada",
        description: isEditing
          ? "La descarga ha sido actualizada correctamente"
          : "La descarga ha sido creada correctamente",
      })

      onClose()
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrió un error inesperado",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter assignments to only show those with remaining fuel
  const availableAssignments = assignments?.filter(
    (a) => Number.parseFloat(a.totalRemaining) > 0 || (isEditing && a.id === discharge.assignmentId),
  )

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar descarga" : "Agregar descarga"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza la información de la descarga seleccionada."
              : "Completa la información para agregar una nueva descarga."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="assignmentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Asignación</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing || assignmentsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una asignación" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableAssignments?.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id.toString()}>
                          {assignment.truck.placa} - {assignment.driver.name} ({assignment.totalRemaining} gal)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customersLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.companyname} - {customer.ruc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalDischarged"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad a Descargar (galones)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="100.00" {...field} />
                  </FormControl>
                  {selectedAssignment && (
                    <p className="text-xs text-muted-foreground">
                      Disponible: {Number.parseFloat(selectedAssignment.totalRemaining).toFixed(2)} galones
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales sobre la descarga" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
