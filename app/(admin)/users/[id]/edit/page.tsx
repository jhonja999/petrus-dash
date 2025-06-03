"use client"
import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import UserEditForm from "@/components/UserEditForm"
import { toast } from "@/components/ui/use-toast"
import type { User as UserType } from "@/types/globals" // Alias User to UserType to avoid conflict with LucideReact User icon

interface PageProps {
  params: Promise<{ id: string }> // params is a Promise
}

export default function EditUserPage({ params }: PageProps) {
  const resolvedParams = use(params) // Unwrap the params Promise
  const userId = Number.parseInt(resolvedParams.id)

  const { isAdmin, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  const [user, setUser] = useState<UserType | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !isLoading) {
      if (!isAuthenticated || !isAdmin) {
        router.push("/unauthorized")
        return
      }
      fetchUser()
    }
  }, [mounted, isLoading, isAuthenticated, isAdmin, userId, router])

  const fetchUser = async () => {
    setLoadingUser(true)
    setError(null)
    try {
      const response = await axios.get(`/api/users/${userId}`)
      if (response.data.success) {
        setUser(response.data.data)
      } else {
        setError(response.data.message || "Error al cargar el usuario.")
        toast({
          title: "Error",
          description: response.data.message || "No se pudo cargar la información del usuario.",
          variant: "destructive",
        })
      }
    } catch (err: any) {
      console.error("Error fetching user:", err)
      setError(err.response?.data?.message || "Error de red al cargar el usuario.")
      toast({
        title: "Error de conexión",
        description: err.response?.data?.message || "No se pudo conectar con el servidor para cargar el usuario.",
        variant: "destructive",
      })
    } finally {
      setLoadingUser(false)
    }
  }

  if (!mounted || isLoading || loadingUser) {
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

  if (error) {
    return (
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Usuario</h1>
              <p className="text-sm text-gray-600">ID: {userId}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/users">Volver</Link>
            </Button>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        </div>
    )
  }

  if (!user) {
    return (
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Usuario</h1>
              <p className="text-sm text-gray-600">ID: {userId}</p>
            </div>
            <Button asChild variant="outline">
              <Link href="/users">Volver</Link>
            </Button>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800">Usuario no encontrado.</p>
            </div>
          </div>
        </div>
    )
  }

  return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Editar Usuario</h1>
            <p className="text-sm text-gray-600">ID: {userId}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/users">Volver</Link>
          </Button>
        </div>
        <UserEditForm initialUser={user} />
      </div>
  )
}
