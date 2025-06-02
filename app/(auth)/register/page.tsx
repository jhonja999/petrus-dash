"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"

// 🔧 Definir los tipos
// Asegúrate de que estos tipos coincidan con los enums de Prisma y los valores enviados a la API
type Role = "Operador" | "Admin" | "S_A" // Changed from S-A to S_A
type State = "Activo" | "Inactivo" | "Suspendido" | "Eliminado" // Added Eliminado for completeness

interface FormData {
  name: string
  lastname: string
  email: string
  dni: string
  role: Role
  state: State
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    name: "",
    lastname: "",
    email: "",
    dni: "",
    role: "Operador",
    state: "Activo",
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const validateForm = () => {
    const { name, lastname, email, dni } = formData

    if (!name.trim() || !lastname.trim() || !email.trim() || !dni.trim()) {
      toast.error("Todos los campos son obligatorios")
      return false
    }

    if (dni.length !== 8 || !/^\d+$/.test(dni)) {
      toast.error("El DNI debe tener exactamente 8 dígitos numéricos")
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error("Por favor ingrese un correo electrónico válido")
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)

    try {
      console.log("Enviando datos:", {
        ...formData,
        email: formData.email.toLowerCase().trim(),
        password: formData.dni, // DNI is used as initial password
      })

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email.toLowerCase().trim(),
          password: formData.dni,
        }),
      })

      const data = await response.json()

      console.log("Respuesta del servidor:", data)

      if (response.ok) {
        toast.success("Registro exitoso. Redirigiendo al login...")
        setTimeout(() => {
          router.push("/login")
        }, 2000)
      } else {
        toast.error(data.error || "Error al registrar usuario")
      }
    } catch (error: any) {
      let errorMessage = "Error al registrar usuario"

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === "object" && error !== null && "request" in error) {
        errorMessage = "No se pudo conectar con el servidor"
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Registro</h1>
          <p className="text-gray-600">Crear nueva cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombres *</label>
              <input
                type="text"
                name="name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Ingrese sus nombres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Apellidos *</label>
              <input
                type="text"
                name="lastname"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50"
                value={formData.lastname}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Ingrese sus apellidos"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico *</label>
            <input
              type="email"
              name="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="usuario@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">DNI *</label>
            <input
              type="text"
              name="dni"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50"
              value={formData.dni}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="12345678"
              maxLength={8}
              pattern="[0-9]{8}"
            />
            <p className="text-xs text-gray-500 mt-1">El DNI será utilizado como contraseña inicial</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <select
                name="role"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50"
                value={formData.role}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="Operador">Operador</option>
                <option value="Admin">Administrador</option>
                <option value="S_A">Desarrollo</option> {/* Changed from S-A to S_A */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                name="state"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50"
                value={formData.state}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
                <option value="Suspendido">Suspendido</option>
                <option value="Eliminado">Eliminado</option> {/* Added Eliminado */}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Registrando...
              </div>
            ) : (
              "Registrarse"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/login" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
            ¿Ya tienes cuenta? Inicia sesión aquí
          </a>
        </div>
      </div>
    </div>
  )
}
