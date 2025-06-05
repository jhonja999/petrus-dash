"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Building2, Edit, Eye, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import axios from "axios"
import dynamic from "next/dynamic"
import type { Customer } from "@/types/globals"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"

function CustomersPageContent() {
  const [mounted, setMounted] = useState(false)
  const { isAdmin, isLoading } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    companyname: "",
    ruc: "",
    address: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({})
  const [pendingSubmission, setPendingSubmission] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading && !isAdmin) {
      router.push("/unauthorized")
    }
  }, [isAdmin, isLoading, router, mounted])

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        toast.info("Cargando clientes...")
        
        const response = await axios.get("/api/customers")
        setCustomers(response.data)
        
        toast.success("Clientes cargados", {
          description: `Se encontraron ${response.data.length} clientes registrados.`,
        })
        
        // Show info toast if no customers found
        if (response.data.length === 0) {
          setTimeout(() => {
            toast.info("📝 Sin clientes", {
              description: "No hay clientes registrados. ¡Crea el primer cliente usando el formulario!",
            })
          }, 1000)
        }
      } catch (error) {
        console.error("Error fetching customers:", error)
        
        let errorMessage = "No se pudieron cargar los clientes."
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 500) {
            errorMessage = "Error del servidor. Verifique que la base de datos esté funcionando."
          } else if (error.response?.status === 401) {
            errorMessage = "Su sesión ha expirado. Inicie sesión nuevamente."
          } else if (error.response?.status === 403) {
            errorMessage = "No tiene permisos para ver los clientes."
          }
        }
        
        toast.error("❌ Error al cargar", {
          description: errorMessage,
        })
      } finally {
        setLoading(false)
      }
    }

    if (mounted && isAdmin) {
      fetchCustomers()
    }
  }, [isAdmin, mounted])

  const validateForm = () => {
    const errors: {[key: string]: string} = {}
    
    // Validate company name
    if (!formData.companyname.trim()) {
      errors.companyname = "El nombre de la empresa es requerido"
    }

    // Validate RUC
    if (!formData.ruc.trim()) {
      errors.ruc = "El RUC es requerido"
    } else if (!/^\d+$/.test(formData.ruc.trim())) {
      errors.ruc = "El RUC debe contener solo números"
    }

    // Validate address
    if (!formData.address.trim()) {
      errors.address = "La dirección es requerida"
    }

    // Check for duplicate RUC
    const existingCustomer = customers.find(customer => customer.ruc === formData.ruc.trim())
    if (existingCustomer) {
      errors.ruc = "Ya existe un cliente con este RUC"
      // Show specific toast for duplicate
      setTimeout(() => {
        toast.error("⚠️ RUC duplicado", {
          description: `El RUC ${formData.ruc.trim()} ya pertenece a "${existingCustomer.companyname}".`,
        })
      }, 100)
    }

    setFormErrors(errors)
    
    // Return validation result with RUC length info
    return {
      isValid: Object.keys(errors).length === 0,
      needsRucConfirmation: Object.keys(errors).length === 0 && formData.ruc.trim().length !== 11
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear specific field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      
      // Show encouraging toast when error is cleared
      if (Object.keys(formErrors).length === 1) { // Only show if this was the last error
        toast.success("✅ Errores corregidos", {
          description: "Formulario listo para enviar.",
        })
      }
    }
  }

  const confirmAndSubmit = async () => {
    if (!pendingSubmission) return

    setIsSubmitting(true)

    try {
      toast.info("⏳ Procesando...", {
        description: "Creando cliente con RUC no estándar.",
      })

      console.log("Enviando datos con confirmación:", pendingSubmission)

      const response = await axios.post("/api/customers", {
        ...pendingSubmission,
        confirmRuc: true
      })
      
      setCustomers((prev) => [...prev, response.data])
      
      // Reset form and show success
      const customerName = response.data.companyname
      setFormData({ companyname: "", ruc: "", address: "" })
      setFormErrors({})
      setPendingSubmission(null)
      
      toast.success("✅ ¡Éxito!", {
        description: `Cliente "${customerName}" creado exitosamente con RUC de ${pendingSubmission.ruc.length} dígitos.`,
      })
      
      // Show additional info for non-standard RUC
      setTimeout(() => {
        toast.info("ℹ️ RUC no estándar guardado", {
          description: "El sistema acepta RUCs con diferentes longitudes según sea necesario.",
        })
      }, 2000)
    } catch (error) {
      console.error("Error creating customer:", error)
      setPendingSubmission(null) // Clear pending submission on error
      handleApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApiError = (error: any) => {
    let errorTitle = "❌ Error"
    let errorMessage = "Error al crear cliente."
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        errorTitle = "⚠️ Error de validación"
        const backendError = error.response.data?.error || error.response.data?.message
        if (backendError) {
          errorMessage = backendError
        }
        
        if (backendError?.includes("RUC")) {
          setFormErrors({ ruc: backendError })
        } else if (backendError?.includes("empresa") || backendError?.includes("nombre")) {
          setFormErrors({ companyname: backendError })
        } else if (backendError?.includes("dirección")) {
          setFormErrors({ address: backendError })
        }
      } else if (error.response?.status === 409) {
        errorTitle = "⚠️ Cliente duplicado"
        errorMessage = "Ya existe un cliente con estos datos."
        setFormErrors({ ruc: "Este RUC ya está registrado" })
      } else if (error.response?.status === 401) {
        errorTitle = "🔒 Sesión expirada"
        errorMessage = "No tienes permisos para realizar esta acción. Inicia sesión nuevamente."
        setTimeout(() => router.push("/login"), 2000)
      } else if (error.response?.status === 403) {
        errorTitle = "🚫 Acceso denegado"
        errorMessage = "No tienes permisos para crear clientes."
      } else if (error.response?.status === 500) {
        errorTitle = "🛠️ Error del servidor"
        errorMessage = "Error interno del servidor. Contacte al administrador."
      } else {
        errorTitle = `❌ Error ${error.response?.status}`
        errorMessage = error.response?.data?.error || "Error desconocido del servidor."
      }
    } else {
      errorTitle = "🌐 Error de conexión"
      errorMessage = "No se pudo conectar con el servidor. Verifique su conexión a internet."
    }
    
    toast.error(errorTitle, {
      description: errorMessage,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validation = validateForm()
    
    if (!validation.isValid) {
      toast.error("⚠️ Formulario incompleto", {
        description: "Por favor corrige los errores marcados en rojo.",
      })
      return
    }

    // Prepare clean data
    const cleanFormData = {
      companyname: formData.companyname.trim(),
      ruc: formData.ruc.trim(),
      address: formData.address.trim(),
    }

    // Check if RUC needs confirmation
    if (validation.needsRucConfirmation) {
      setPendingSubmission(cleanFormData)
      
      toast("⚠️ RUC no estándar", {
        description: `El RUC tiene ${cleanFormData.ruc.length} dígitos en lugar de 11. ¿Deseas continuar?`,
        action: {
          label: "Confirmar",
          onClick: confirmAndSubmit,
        },
        cancel: {
          label: "Cancelar",
          onClick: () => {
            setPendingSubmission(null)
            toast.info("❌ Cancelado", {
              description: "Creación de cliente cancelada. Puedes corregir el RUC."
            })
          },
        },
      })
      return
    }

    // Normal submission for standard RUC
    setIsSubmitting(true)

    try {
      toast.info("⏳ Creando cliente...", {
        description: `Registrando "${cleanFormData.companyname}" en el sistema.`,
      })

      console.log("Enviando datos:", cleanFormData)

      const response = await axios.post("/api/customers", cleanFormData)
      setCustomers((prev) => [...prev, response.data])
      
      // Reset form and show success
      const customerName = response.data.companyname
      setFormData({ companyname: "", ruc: "", address: "" })
      setFormErrors({})
      
      toast.success("✅ ¡Cliente creado!", {
        description: `"${customerName}" se ha registrado exitosamente con RUC ${response.data.ruc}.`,
      })
      
      // Show form reset confirmation
      setTimeout(() => {
        toast.info("📝 Formulario listo", {
          description: "Puedes crear otro cliente cuando gustes.",
        })
      }, 2000)
    } catch (error) {
      console.error("Error creating customer:", error)
      handleApiError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show loading state until mounted and auth is resolved
  if (!mounted || isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Acceso denegado</h2>
          <p className="text-gray-600">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
              <p className="text-sm text-gray-600">Administra la base de datos de clientes</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">Volver</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="h-5 w-5 mr-2" />
                  Nuevo Cliente
                </CardTitle>
                <CardDescription>Registrar nueva empresa cliente</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyname">Nombre de la Empresa</Label>
                    <Input
                      id="companyname"
                      value={formData.companyname}
                      onChange={(e) => handleInputChange("companyname", e.target.value)}
                      placeholder="EMPRESA S.A.C"
                      required
                      className={formErrors.companyname ? "border-red-500" : ""}
                    />
                    {formErrors.companyname && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {formErrors.companyname}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ruc">RUC</Label>
                    <Input
                      id="ruc"
                      value={formData.ruc}
                      onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, '')
                        handleInputChange("ruc", value)
                      }}
                      placeholder="20123456789"
                      required
                      className={formErrors.ruc ? "border-red-500" : ""}
                    />
                    {formErrors.ruc && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {formErrors.ruc}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Recomendado: 11 dígitos. Se permite confirmar con menos dígitos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => handleInputChange("address", e.target.value)}
                      placeholder="Av. Principal 123, Cajamarca"
                      required
                      className={formErrors.address ? "border-red-500" : ""}
                    />
                    {formErrors.address && (
                      <p className="text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-1" />
                        {formErrors.address}
                      </p>
                    )}
                  </div>

                  {Object.keys(formErrors).length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Por favor corrige los errores antes de continuar.
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      pendingSubmission ? "⏳ Confirmando..." : "⏳ Creando..."
                    ) : (
                      "Crear Cliente"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Lista de Clientes ({customers.length})
                </CardTitle>
                <CardDescription>Gestiona los clientes registrados en el sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>RUC</TableHead>
                        <TableHead>Dirección</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium">{customer.companyname}</TableCell>
                          <TableCell>{customer.ruc}</TableCell>
                          <TableCell className="max-w-xs truncate">{customer.address}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/customers/${customer.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-1" />
                                  Editar
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {customers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No hay clientes registrados</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// Export the component with dynamic import and SSR disabled
const CustomersPage = dynamic(() => Promise.resolve(CustomersPageContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
})

export default CustomersPage