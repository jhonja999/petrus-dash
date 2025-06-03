import type React from "react"
// types/globals.d.ts
import type { Decimal } from "@prisma/client/runtime/library"
import type { UserRole, UserState, FuelType, TruckState } from "@prisma/client"

// Re-export Prisma types for easier access
export type { UserRole, UserState, FuelType, TruckState } from "@prisma/client"

// Main User interface - consistent with Prisma and AuthContext
export interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: UserRole // "Admin" | "Operador" | "S_A"
  state: UserState // "Activo" | "Inactivo" | "Suspendido" | "Eliminado" | "Asignado"
  dni: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export interface Truck {
  id: number
  placa: string
  typefuel: FuelType // "DIESEL_B5" | "GASOLINA_90" | "GASOLINA_95" | "GLP" | "ELECTRICA"
  capacitygal: Decimal
  lastRemaining: Decimal
  state: TruckState // "Activo" | "Inactivo" | "Mantenimiento" | "Transito" | "Descarga" | "Asignado"
  createdAt?: Date // Added for consistency
  updatedAt?: Date // Added for consistency
}

export interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
  createdAt?: Date // Added for consistency
  updatedAt?: Date // Added for consistency
}

export interface Assignment {
  id: number
  truckId: number
  driverId: number
  totalLoaded: Decimal
  totalRemaining: Decimal
  fuelType: FuelType
  isCompleted: boolean
  notes?: string | null
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
  marcadorInicial?: Decimal | null
  marcadorFinal?: Decimal | null
  cantidadReal?: Decimal | null
  assignment: Assignment
  customer: Customer
  createdAt: Date
  updatedAt: Date
}

export interface DailyAssignmentSummary {
  assignment: Assignment
  totalDischarges: number
  completedDischarges: number
  remainingFuel: Decimal
  previousDayRemaining: Decimal
  totalAvailableFuel: number
}

// Auth-related types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  dni: string
  name: string
  lastname: string
  role: UserRole
}

export interface AuthResponse {
  success: boolean
  user?: User
  error?: string
  redirectUrl?: string
}

// Utility types for API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Component prop types
export interface DashboardCardProps {
  title: string
  description?: string
  icon?: React.ReactNode
  children: React.ReactNode
}

// Form types
export interface AssignmentFormData {
  truckId: number
  driverId: number
  totalLoaded: number
  fuelType: FuelType
  notes?: string
}

export interface DischargeFormData {
  assignmentId: number
  customerId: number
  totalDischarged: number
  marcadorInicial?: number
  marcadorFinal?: number
}

// Error types
export interface ValidationError {
  field: string
  message: string
}

export interface ApiError {
  message: string
  code?: string
  details?: ValidationError[]
}
