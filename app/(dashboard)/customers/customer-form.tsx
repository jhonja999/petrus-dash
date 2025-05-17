"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import { Loader2, ArrowRight, Save } from "lucide-react"
import Link from "next/link"
import { DataPreview } from "@/components/ui/data-preview"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const customerSchema = z.object({
  companyname: z.string().min(3, "El nombre de la empresa debe tener al menos 3 caracteres"),
  ruc: z.string().length(11, "El RUC debe tener 11 dígitos"),
  address: z.string().min(5, "La dirección debe tener al menos 5 caracteres"),
  contactName: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email("Email inválido").optional().or(z.literal("")),
})

// Define the type for our form values
type CustomerFormValues = z.infer<typeof customerSchema>;

// Define a type guard to check if a field exists in the form values
const isValidField = (field: string): field is keyof CustomerFormValues => {
  return ['companyname', 'ruc', 'address', 'contactName', 'contactPhone', 'contactEmail'].includes(field);
}

interface CustomerFormProps {
  customer?: any
  onClose?: () => void
  redirectAfterSubmit?: boolean
}

export function CustomerForm({ customer, onClose, redirectAfterSubmit = false }: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const router = useRouter()
  const isEditing = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      companyname: customer?.companyname || "",
      ruc: customer?.ruc || "",
      address: customer?.address || "",
      contactName: customer?.contactName || "",
      contactPhone: customer?.contactPhone || "",
      contactEmail: customer?.contactEmail || "",
    },
  })

  const watchedValues = form.watch()

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      const url = "/api/customers"
      const method = isEditing ? "PATCH" : "POST"
      const body = isEditing ? { id: customer.id, ...data } : data

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error || `Error ${response.status}: ${response.statusText}`)
      }

      toast({
        title: isEditing ? "Cliente actualizado" : "Cliente creado",
        description: isEditing
          ? "El cliente ha sido actualizado correctamente"
          : "El cliente ha sido creado correctamente",
      })

      // Manejo mejorado de redireccionamiento/cierre
      if (onClose) {
        onClose() // Si hay función onClose, es un modal -> cerrarlo
      } else if (redirectAfterSubmit) {
        router.push("/customers") // Si estamos en página y queremos redirigir
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

  // Get the fields to exclude from the preview
  const getFieldsToExclude = () => {
    return ['contactName', 'contactPhone', 'contactEmail'].filter(field => {
      if (isValidField(field)) {
        return !watchedValues[field];
      }
      return true;
    });
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="companyname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la Empresa</FormLabel>
                    <FormControl>
                      <Input placeholder="Empresa ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ruc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RUC</FormLabel>
                    <FormControl>
                      <Input placeholder="20123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Av. Principal 123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de Contacto</FormLabel>
                    <FormControl>
                      <Input placeholder="987654321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email de Contacto</FormLabel>
                  <FormControl>
                    <Input placeholder="contacto@empresa.com" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="preview">
            <DataPreview
              title="Vista Previa del Cliente"
              description="Revise los datos antes de guardar"
              data={watchedValues}
              excludeFields={getFieldsToExclude()}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {redirectAfterSubmit || onClose ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose || (() => router.push("/customers"))} 
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          ) : (
            <Button type="button" variant="outline" asChild>
              <Link href="/customers">Cancelar</Link>
            </Button>
          )}
          
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? "Actualizar" : "Guardar"}
          </Button>
        </div>
      </form>
    </Form>
  )

  // Si estamos en un modal (onClose está definido), render con Dialog
  if (onClose) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar cliente" : "Nuevo Cliente"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Actualiza la información del cliente seleccionado."
                : "Completa la información para agregar un nuevo cliente."}
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
    )
  }

  // Si estamos en una página (no hay onClose), render sin Dialog
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Información del Cliente</h3>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}