import type React from "react"
import { AuthProvider } from "@/contexts/AuthContext"

export default function DespachoLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}
