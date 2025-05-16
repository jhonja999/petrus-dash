"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { Loader2, ArrowRight, Save } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import { DataPreview } from "@/components/ui/data-preview"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const assignmentSchema = z.object({
  truckId: z.string().min(1, "Seleccione un camión"),
  driverId: z.string().min(1, "Seleccione un conductor"),
  fuelType: z.string().min(1, "Seleccione un tipo de combustible"),
  totalLoaded: z.coerce
    .number()
    .positive("La cantidad debe ser mayor a 0")
    .max(10000, "La cantidad máxima es 10,000 galones"),
  notes: z.string().optional(),
})

// Define the type from the schema
type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface AssignmentFormProps {
  assignment?: any
  onClose?: () => void
  redirectAfterSubmit?: boolean
  trucks?: any[]
  drivers?: any[]
}

export function AssignmentForm({
  assignment,
  onClose,
  redirectAfterSubmit = false,
  trucks: propTrucks,
  drivers: propDrivers,
}: AssignmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const router = useRouter()
  const isEditing = !!assignment

  const [selectedTruck, setSelectedTruck] = useState<any>(null)

  const { data: fetchedTrucks, isLoading: trucksLoading } = useApi<any[]>("/api/trucks", {
    queryParams: { state: "Activo" },
  })

  const { data: fetchedDrivers, isLoading: driversLoading } = useApi<any[]>("/api/users", {
    queryParams: { role: "Conductor", state: "Activo" },
  })

  const trucks = propTrucks || fetchedTrucks || []
  const drivers = propDrivers || fetchedDrivers || []

  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      truckId: assignment?.truck?.id?.toString() || "",
      driverId: assignment?.driver?.id?.toString() || "",
      fuelType: assignment?.fuelType || "",
      totalLoaded: assignment?.totalLoaded?.toString() || "",
      notes: assignment?.notes || "",
    },
  })

  const watchedValues = form.watch()
  const watchedTruckId = form.watch("truckId")

  // Update selected truck when truckId changes
  useEffect(() => {
    if (watchedTruckId && trucks.length > 0) {
      const truck = trucks.find((t) => t.id.toString() === watchedTruckId)
      if (truck) {
        setSelectedTruck(truck)
        form.setValue("fuelType", truck.typefuel)
      }
    }
  }, [watchedTruckId, trucks, form])

  const onSubmit = async (data: AssignmentFormValues) => {
    setIsSubmitting(true)
    try {
      const url = "/api/assignments"
      const method = isEditing ? "PATCH" : "POST"
      const body = isEditing ? { id: assignment.id, ...data } : data

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
        title: isEditing ? "Asignación actualizada" : "Asignación creada",
        description: isEditing
          ? "La asignación ha sido actualizada correctamente"
          : "La asignación ha sido creada correctamente",
      })

      if (redirectAfterSubmit) {
        router.push("/assignment")
      } else if (onClose) {
        onClose()
      }
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

  const fuelTypeLabels: Record<string, string> = {
    DIESEL_B5: "Diesel B5",
    GASOLINA_90: "Gasolina 90",
    GASOLINA_95: "Gasolina 95",
    GLP: "GLP",
    ELECTRICA: "Eléctrica",
  }

  type FormatterKey = keyof AssignmentFormValues;
  
  // Type-safe formatters
  const formatters: {
    [K in FormatterKey]?: (value: any) => React.ReactNode;
  } = {
    truckId: (value: string) => {
      const truck = trucks.find((t) => t.id.toString() === value)
      return truck ? `${truck.placa} (${truck.typefuel})` : value
    },
    driverId: (value: string) => {
      const driver = drivers.find((d) => d.id.toString() === value)
      return driver ? `${driver.name} ${driver.lastname}` : value
    },
    fuelType: (value: string) => <Badge>{fuelTypeLabels[value] || value}</Badge>,
    totalLoaded: (value: number) => `${value} galones`,
  }

  // Type-safe way to check if a field exists and has a value
  const hasValue = (field: keyof AssignmentFormValues): boolean => {
    return !!watchedValues[field];
  }

  // Form content that will be used in both modal and page versions
  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Formulario</TabsTrigger>
            <TabsTrigger value="preview">Vista Previa</TabsTrigger>
          </TabsList>
          <TabsContent value="form" className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="truckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Camión</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value)
                      const truck = trucks.find((t) => t.id.toString() === value)
                      if (truck) {
                        setSelectedTruck(truck)
                        form.setValue("fuelType", truck.typefuel)
                      }
                    }}
                    defaultValue={field.value}
                    disabled={isEditing || trucksLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un camión" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trucks?.map((truck) => (
                        <SelectItem key={truck.id} value={truck.id.toString()}>
                          {truck.placa} - {truck.typefuel} ({truck.capacitygal} gal)
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
              name="driverId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conductor</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing || driversLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un conductor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers?.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id.toString()}>
                          {driver.name} {driver.lastname} - {driver.dni}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="fuelType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Combustible</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo de combustible" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DIESEL_B5">Diesel B5</SelectItem>
                        <SelectItem value="GASOLINA_90">Gasolina 90</SelectItem>
                        <SelectItem value="GASOLINA_95">Gasolina 95</SelectItem>
                        <SelectItem value="GLP">GLP</SelectItem>
                        <SelectItem value="ELECTRICA">Eléctrica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalLoaded"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carga Total (galones)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="500.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales sobre la asignación" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedTruck && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">Información del camión seleccionado:</p>
                <p className="text-sm">
                  Placa: <span className="font-medium">{selectedTruck.placa}</span>
                </p>
                <p className="text-sm">
                  Capacidad: <span className="font-medium">{selectedTruck.capacitygal} galones</span>
                </p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="preview">
            <DataPreview
              title="Vista Previa de la Asignación"
              description="Revise los datos antes de guardar"
              data={watchedValues}
              formatters={formatters}
              excludeFields={["notes"].filter(field => !hasValue(field as keyof AssignmentFormValues))}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {redirectAfterSubmit ? (
            <Button type="button" variant="outline" asChild>
              <Link href="/assignment">Cancelar</Link>
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
          )}
          {activeTab === "form" ? (
            <Button
              type="button"
              onClick={() => setActiveTab("preview")}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Vista Previa <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {isEditing ? "Actualizar" : "Guardar"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  )

  // If we're in a modal (onClose is provided), render with Dialog
  if (onClose) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar asignación" : "Nueva Asignación"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Actualiza la información de la asignación seleccionada."
                : "Completa la información para agregar una nueva asignación."}
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  // If we're on a page (no onClose), render without Dialog
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Información de la Asignación</h3>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}