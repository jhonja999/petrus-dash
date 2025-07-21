// agrega este export para prevenir la generación estática
export const dynamic = 'force-dynamic'

import type React from "react"
import { redirect } from "next/navigation"
import { getUserFromToken } from "@/lib/jwt"
import DashboardLayout from "@/components/shared/DashboardLayout"
import { Toaster } from "@/components/ui/sonner"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log(`🏗️ AdminLayout: Verificando autenticación`)

  const user = await getUserFromToken()

  // Check if user is authenticated
  if (!user) {
    console.log(`❌ AdminLayout: No se encontró usuario, redirigiendo al login`)
    redirect("/login")
  }

  console.log(`👤 AdminLayout: Usuario encontrado - Rol: ${user.role}, Estado: ${user.state}`)

  // Check user state
  if (user.state !== "Activo" && user.state !== "Asignado") {
    console.log(`⚠️ AdminLayout: Estado de usuario inválido: ${user.state}`)
    redirect("/unauthorized")
  }

  // Check if user has admin access (Admin or S_A)
  if (user.role !== "Admin" && user.role !== "S_A") {
    console.log(`❌ AdminLayout: Rol insuficiente: ${user.role}`)
    redirect("/unauthorized")
  }

  console.log(`✅ AdminLayout: Acceso concedido`)
    
  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
    </>
  )
}
