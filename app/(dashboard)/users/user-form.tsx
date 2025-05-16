"use client"

import { useState } from "react"
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
import Link from "next/link"
import { DataPreview } from "@/components/ui/data-preview"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

const userSchema = z.object({
  dni: z.string().length(8, "El DNI debe tener 8 dígitos"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastname: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.string().min(1, "Seleccione un rol"),
  state: z.string().min(1, "Seleccione un estado"),
})

interface UserFormProps {
  user?: any
  onClose?: () => void
  redirectAfterSubmit?: boolean
}

export function UserForm({ user, onClose, redirectAfterSubmit = false }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const router = useRouter()
  const isEditing = !!user

  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      dni: user?.dni || "",
      name: user?.name || "",
      lastname: user?.lastname || "",
      email: user?.email || "",
      role: user?.role || "Conductor",
      state: user?.state || "Activo",
    },
  })

  const watchedValues = form.watch()

  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    setIsSubmitting(true)
    try {
      const url = "/api/users"
      const method = isEditing ? "PATCH" : "POST"
      const body = isEditing ? { id: user.id, ...data } : data

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
        title: isEditing ? "Usuario actualizado" : "Usuario creado",
        description: isEditing
          ? "El usuario ha sido actualizado correctamente"
          : "El usuario ha sido creado correctamente",
      })

      if (redirectAfterSubmit) {
        router.push("/users")
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

  const roleLabels: Record<string, string> = {
    Conductor: "Conductor",
    ADMIN: "Administrador",
  }

  const stateLabels: Record<string, string> = {
    Activo: "Activo",
    Inactivo: "Inactivo",
    Suspendido: "Suspendido",
    Asignado: "Asignado",
  }

  const formatters = {
    role: (value: string) => (
      <Badge variant={value === "ADMIN" ? "secondary" : "default"}>{roleLabels[value] || value}</Badge>
    ),
    state: (value: string) => (
      <Badge
        variant={
          value === "Activo"
            ? "secondary"
            : value === "Inactivo"
              ? "destructive"
              : value === "Suspendido"
                ? "outline"
                : "default"
        }
      >
        {stateLabels[value] || value}
      </Badge>
    ),
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
                name="dni"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DNI</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="usuario@ejemplo.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Juan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input placeholder="Pérez" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Conductor">Conductor</SelectItem>
                        <SelectItem value="ADMIN">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
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
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Activo">Activo</SelectItem>
                        <SelectItem value="Inactivo">Inactivo</SelectItem>
                        <SelectItem value="Suspendido">Suspendido</SelectItem>
                        <SelectItem value="Asignado">Asignado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </TabsContent>
          <TabsContent value="preview">
            <DataPreview
              title="Vista Previa del Usuario"
              description="Revise los datos antes de guardar"
              data={watchedValues}
              formatters={formatters}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          {redirectAfterSubmit ? (
            <Button type="button" variant="outline" asChild>
              <Link href="/users">Cancelar</Link>
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
            <DialogTitle>{isEditing ? "Editar usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Actualiza la información del usuario seleccionado."
                : "Completa la información para agregar un nuevo usuario."}
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
        <h3 className="text-lg font-medium">Información del Usuario</h3>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  )
}