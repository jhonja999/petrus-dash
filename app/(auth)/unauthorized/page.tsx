"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth" // Corrected import path

export default function UnauthorizedPage() {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push("/") // Redirect to homepage after logout
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md text-center">
        <LockIcon className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Acceso Denegado</h1>
        <p className="mt-4 text-lg text-gray-600">No tienes los permisos necesarios para acceder a esta página.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <Button onClick={handleLogout} className="w-full sm:w-auto">
            Cerrar Sesión
          </Button>
          <Button onClick={() => router.push("/")} variant="outline" className="w-full sm:w-auto">
            Volver al Inicio
          </Button>
        </div>
      </div>
    </div>
  )
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
