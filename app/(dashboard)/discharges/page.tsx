import type { Metadata } from "next"
import { DischargesClient } from "./discharges-client"

export const metadata: Metadata = {
  title: "Descargas | Sistema de Despacho de Combustible",
  description: "Gestión de descargas para el sistema de despacho de combustible",
}

export default function DischargesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Descargas</h1>
      </div>
      <DischargesClient />
    </div>
  )
}
