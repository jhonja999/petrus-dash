import type { Metadata } from "next"
import { AssignmentsClient } from "./assignments-client"

export const metadata: Metadata = {
  title: "Asignaciones | Petrus",
  description: "Gestión de asignaciones para el sistema de despacho de combustible",
}

export default function AssignmentsPage() {
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Asignaciones</h2>
      </div>
      <div className="space-y-4">
        <AssignmentsClient />
      </div>
    </div>
  )
}
