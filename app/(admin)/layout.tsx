// ✅ Add this export to prevent static generation
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
  console.log(`🏗️ AdminLayout: Checking authentication`)

  const user = await getUserFromToken()

  // Check if user is authenticated
  if (!user) {
    console.log(`❌ AdminLayout: No user found, redirecting to login`)
    redirect("/login")
  }

  console.log(`👤 AdminLayout: User found - Role: ${user.role}, State: ${user.state}`)

  // Check user state
  if (user.state !== "Activo" && user.state !== "Asignado") {
    console.log(`⚠️ AdminLayout: Invalid user state: ${user.state}`)
    redirect("/unauthorized")
  }

  // Check if user has admin access (Admin or S_A)
  if (user.role !== "Admin" && user.role !== "S_A") {
    console.log(`❌ AdminLayout: Insufficient role: ${user.role}`)
    redirect("/unauthorized")
  }

  console.log(`✅ AdminLayout: Access granted`)
    
  return (
    <>
      <DashboardLayout>{children}</DashboardLayout>
    </>
  )
}