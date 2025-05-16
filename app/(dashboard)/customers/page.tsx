import type { Metadata } from "next"
import { CustomersClient } from "./customers-client"

export const metadata: Metadata = {
  title: "Clientes | Petrus",
  description: "Gestión de clientes para el sistema de despacho de combustible",
}

export default function CustomersPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
      </div>
      <div className="space-y-4">
        <CustomersClient />
      </div>
    </div>
  )
}
