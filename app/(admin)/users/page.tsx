"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "@/components/ui/use-toast" // Import toast

interface UserData {
  id: number
  name: string
  lastname: string
  email: string
  dni: string
  role: string
  state: string
  createdAt: string
}

export default function UsersPage() {
  const { isAdmin, isSuperAdmin, isLoading } = useAuth()
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    email: "",
    dni: "",
    password: "",
    role: "Operador",
    state: "Activo",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  useEffect(() => {
    const fetchUsers = async () => {
      if (!mounted || isLoading || !isAdmin) return

      try {
        setLoading(true)
        const response = await axios.get("/api/users")
        setUsers(response.data)
        setError(null)
      } catch (err: any) {
        console.error("Error fetching users:", err)
        setError(err.response?.data?.error || "Error al cargar usuarios")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [mounted, isLoading, isAdmin])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validación básica
      if (!formData.name || !formData.lastname || !formData.email || !formData.dni || !formData.password) {
        toast({
          title: "Error de validación",
          description: "Todos los campos son obligatorios.",
          variant: "destructive",
        })
        return
      }

      // Validar que solo S_A puede crear otros S_A
      if (formData.role === "S_A" && !isSuperAdmin) {
        toast({
          title: "Permiso denegado",
          description: "Solo Super Administradores pueden crear otros Super Administradores.",
          variant: "destructive",
        })
        return
      }

      const response = await axios.post("/api/users", formData)

      // Actualizar la lista de usuarios
      setUsers((prev) => [...prev, response.data])

      // Resetear el formulario
      setFormData({
        name: "",
        lastname: "",
        email: "",
        dni: "",
        password: "",
        role: "Operador",
        state: "Activo",
      })

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente.",
      })
    } catch (err: any) {
      console.error("Error creating user:", err)
      toast({
        title: "Error al crear usuario",
        description: err.response?.data?.error || err.message || "Hubo un problema al crear el usuario.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Función para obtener el color de la badge según el rol
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "S_A":
        return "bg-purple-100 text-purple-800"
      case "Admin":
        return "bg-blue-100 text-blue-800"
      case "Operador":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Función para obtener el color de la badge según el estado
  const getStateBadgeColor = (state: string) => {
    switch (state) {
      case "Activo":
        return "bg-green-100 text-green-800"
      case "Inactivo":
        return "bg-gray-100 text-gray-800"
      case "Suspendido":
        return "bg-yellow-100 text-yellow-800"
      case "Eliminado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Acceso denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-600">Administra los usuarios del sistema</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">Volver</Link>
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="h-5 w-5 mr-2" />
                Nuevo Usuario
              </CardTitle>
              <CardDescription>Crear un nuevo usuario en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Juan"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastname">Apellido</Label>
                    <Input
                      id="lastname"
                      name="lastname"
                      value={formData.lastname}
                      onChange={handleInputChange}
                      placeholder="Pérez"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="juan.perez@ejemplo.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dni">DNI</Label>
                  <Input
                    id="dni"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    placeholder="12345678"
                    maxLength={8}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={formData.role} onValueChange={(value) => handleSelectChange("role", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operador">Operador (Conductor)</SelectItem>
                      <SelectItem value="Admin">Administrador</SelectItem>
                      {isSuperAdmin && <SelectItem value="S_A">Super Administrador</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select value={formData.state} onValueChange={(value) => handleSelectChange("state", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="Inactivo">Inactivo</SelectItem>
                      <SelectItem value="Suspendido">Suspendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creando..." : "Crear Usuario"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Lista de Usuarios ({users.length})
              </CardTitle>
              <CardDescription>Gestiona los usuarios registrados en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>DNI</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.name} {user.lastname}
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.dni}</TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {user.role === "S_A" ? "Super Admin" : user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStateBadgeColor(user.state)}>{user.state}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/users/${user.id}/edit`}>Editar</Link>
                              </Button>
                              {user.role === "Operador" && (
                                <Button size="sm" variant="outline" asChild>
                                  <Link href={`/despacho/${user.id}`}>Ver Despacho</Link>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {users.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No hay usuarios registrados</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
