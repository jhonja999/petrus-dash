"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"
import { DataPreview } from "@/components/ui/data-preview"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, ArrowRight, Save } from "lucide-react"
import { cn } from "@/lib/utils"

const truckSchema = z.object({
  placa: z.string().min(1, "La placa es requerida"),
  typefuel: z.string().min(1, "El tipo de combustible es requerido"),
  capacitygal: z.coerce.number().min(1, "La capacidad debe ser mayor a 0"),
  state: z.string().min(1, "El estado es requerido"),
})

type TruckFormValues = z.infer<typeof truckSchema>

interface TruckFormProps {
  truck?: any
  onClose?: () => void
  redirectAfterSubmit?: boolean
}

export function TruckForm({ truck, onClose, redirectAfterSubmit = false }: TruckFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const router = useRouter()

  const form = useForm<TruckFormValues>({
    resolver: zodResolver(truckSchema),
    defaultValues: {
      placa: truck?.placa || "",
      typefuel: truck?.typefuel || "",
      capacitygal: truck?.capacitygal || "",
      state: truck?.state || "Activo",
    },
  })

  const watchedValues = form.watch()

  const onSubmit = async (data: TruckFormValues) => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/trucks", {
        method: truck ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          ...(truck && { id: truck.id }),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al guardar el camión")
      }

      toast({
        title: truck ? "Camión actualizado" : "Camión creado",
        description: truck ? "El camión ha sido actualizado correctamente" : "El camión ha sido creado correctamente",
      })

      if (redirectAfterSubmit) {
        router.push("/trucks")
        router.refresh()
      } else if (onClose) {
        onClose()
      }
    } catch (error) {
      console.error("Error saving truck:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error al guardar el camión",
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

  const stateLabels: Record<string, string> = {
    Activo: "Activo",
    Inactivo: "Inactivo",
    Mantenimiento: "Mantenimiento",
  }

  const formatters = {
    typefuel: (value: string) => fuelTypeLabels[value] || value,
    state: (value: string) => (
      <Badge variant={value === "Activo" ? "success" : value === "Inactivo" ? "destructive" : "default"}>
        {stateLabels[value] || value}
      </Badge>
    ),
    capacitygal: (value: number) => `${value} galones`,
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
              name="placa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Placa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese la placa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="typefuel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Combustible</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de combustible" />
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
              name="capacitygal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacidad (galones)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Ingrese la capacidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                      <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="preview">
            <DataPreview
              title="Vista Previa del Camión"
              description="Revise los datos antes de guardar"
              data={watchedValues}
              formatters={formatters}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {redirectAfterSubmit ? (
            <Button type="button" variant="outline" asChild>
              <Link href="/trucks">Cancelar</Link>
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
              {truck ? "Actualizar" : "Guardar"}
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
            <DialogTitle>{truck ? "Editar Camión" : "Nuevo Camión"}</DialogTitle>
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
        <h3 className="text-lg font-medium">Información del Camión</h3>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}

// Add this component for the badge
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variant === "default" && "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        variant === "secondary" && "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        variant === "destructive" &&
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        variant === "outline" && "text-foreground",
        variant === "success" && "border-transparent bg-emerald-500 text-white hover:bg-emerald-500/80",
        className,
      )}
      {...props}
    />
  )
}
