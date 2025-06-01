import type { Decimal } from "@prisma/client/runtime/library"

export interface User {
  id: number // Cambiado a number para consistencia con Prisma
  dni: string
  name: string
  lastname: string
  email: string
  // Actualizado para reflejar los roles de Prisma y Zod
  role: "Operador" | "Admin" | "S_A"
  state: "Activo" | "Inactivo" | "Suspendido" | "Eliminado" | "Asignado"
  createdAt: Date
  updatedAt: Date
}

export interface Truck {
  id: number
  placa: string
  typefuel: "DIESEL_B5" | "GASOLINA_90" | "GASOLINA_95" | "GLP" | "ELECTRICA"
  capacitygal: Decimal
  lastRemaining: Decimal
  state: "Activo" | "Inactivo" | "Mantenimiento" | "Transito" | "Descarga" | "Asignado"
}

export interface Assignment {
  id: number
  truckId: number
  driverId: number
  totalLoaded: Decimal
  totalRemaining: Decimal
  fuelType: "DIESEL_B5" | "GASOLINA_90" | "GASOLINA_95" | "GLP" | "ELECTRICA"
  truck: Truck
  driver: User
  discharges: Discharge[]
  createdAt: Date
  updatedAt: Date
}

export interface Discharge {
  id: number
  assignmentId: number
  customerId: number
  totalDischarged: Decimal
  status: string
  marcadorInicial?: Decimal
  marcadorFinal?: Decimal
  cantidadReal?: Decimal
  assignment: Assignment
  customer: Customer
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
}
