"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "react-toastify"
import { useAuth } from "@/hooks/useAuth" // Corrected import path

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { login } = useAuth() // Use the login function from AuthContext

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.email.trim() || !formData.password.trim()) {
        toast.error("Por favor complete todos los campos")
        return
      }

      // Use the login function from AuthContext
      await login(formData.email.toLowerCase().trim(), formData.password)
      toast.success("Inicio de sesión exitoso")
      // The login function in AuthContext already handles redirection
    } catch (error: any) {
      let errorMessage = "Error al iniciar sesión"

      if (error instanceof Error) {
        errorMessage = error.message
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "data" in error.response &&
        typeof error.response.data === "object" &&
        error.response.data !== null &&
        "message" in error.response.data &&
        typeof error.response.data.message === "string"
      ) {
        errorMessage = error.response.data.message
      } else if (typeof error === "object" && error !== null && "request" in error) {
        errorMessage = "Error de conexión. Verifique su internet"
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Petrus</h1>
          <p className="text-gray-600">Sistema de Gestión</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
            <input
              type="email"
              name="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="usuario@empresa.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              name="password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Ingrese su contraseña"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Iniciando sesión...
              </div>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200">
            ¿No tienes cuenta? Regístrate aquí
          </a>
        </div>
      </div>
    </div>
  )
}
