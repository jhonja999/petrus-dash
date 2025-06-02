import type React from "react"
import { redirect } from "next/navigation"
import { getUserFromToken } from "@/lib/jwt"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserFromToken()

  // Check if user is authenticated
  if (!user) {
    redirect("/login")
  }

  // Check if user has admin access (Admin or S_A)
  if (user.role !== "Admin" && user.role !== "S_A") {
    redirect("/unauthorized")
  }

  return <>{children}</>
}
