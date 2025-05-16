import type { Metadata } from "next"
import { ReportsClient } from "./reports-client"

export const metadata: Metadata = {
  title: "Reportes | Sistema de Despacho de Combustible",
  description: "Reportes para el sistema de despacho de combustible",
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
      </div>
      <ReportsClient />
    </div>
  )
}
