import type { Metadata } from "next"
import { UsersClient } from "./users-client"

export const metadata: Metadata = {
  title: "Usuarios | Petrus",
  description: "Gestión de usuarios para el sistema de despacho de combustible",
}

export default function UsersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Usuarios</h2>
      </div>
      <div className="space-y-4">
        <UsersClient />
      </div>
    </div>
  )
}
