import type React from "react"
import type { Decimal } from "@prisma/client/runtime/library"
import type { UserRole, UserState, FuelType, TruckState, DischargeStatus, DispatchStatus, Role } from "@prisma/client" // Import Role enum from Prisma client

// Re-export Prisma types for easier access
export type {
  UserRole,
  UserState,
  FuelType,
  TruckState,
  DischargeStatus,
  DispatchStatus,
  Role,
} from "@prisma/client"

// Fuel type labels for UI
export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  DIESEL_B5: "Diésel B5",
  DIESEL_B500: "Diésel B500",
  GASOLINA_PREMIUM_95: "Gasolina Premium 95",
  GASOLINA_REGULAR_90: "Gasolina Regular 90",
  GASOHOL_84: "Gasohol 84",
  GASOHOL_90: "Gasohol 90",
  GASOHOL_95: "Gasohol 95",
  SOLVENTE: "Solvente",
  GASOL: "Gasol",
  PERSONALIZADO: "Personalizado",
}

// Dispatch status labels
export const DISPATCH_STATUS_LABELS: Record<DispatchStatus, string> = {
  PROGRAMADO: "Programado",
  CARGANDO: "Cargando",
  EN_RUTA: "En Ruta",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
}

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
  typefuel: FuelType
  capacitygal: Decimal
  lastRemaining: Decimal
  state: TruckState
  // Nuevos campos para gestión de capacidades
  minCapacity: Decimal
  maxCapacity: Decimal
  currentLoad: Decimal
  customFuelType?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
  createdAt: Date
  updatedAt: Date
}

export interface Assignment {
  id: number
  truckId: number
  driverId: number
  totalLoaded: Decimal
  totalRemaining: Decimal
  fuelType: FuelType
  customFuelName?: string | null
  isCompleted: boolean
  completedAt?: Date | null
  notes?: string | null
  truck: Truck
  driver: User
  discharges: Discharge[]
  createdAt: Date
  updatedAt: Date
}

// Nuevo interface para Dispatch
export interface Dispatch {
  id: number
  dispatchNumber: string // PE-000001-2025
  year: number
  sequenceNumber: number
  truckId: number
  driverId: number
  customerId: number
  fuelType: FuelType
  customFuelName?: string | null
  quantity: Decimal
  deliveredQuantity?: Decimal | null
  locationGPS?: string | null
  locationManual?: string | null
  address: string
  status: DispatchStatus
  scheduledDate: Date
  startedAt?: Date | null
  enRouteAt?: Date | null
  completedAt?: Date | null
  notes?: string | null
  priority: number
  truck: Truck
  driver: User
  customer: Customer
  createdAt: Date
  updatedAt: Date
}

export interface Discharge {
  id: number
  assignmentId: number
  customerId: number
  totalDischarged: Decimal
  status: DischargeStatus
  marcadorInicial?: Decimal | null
  marcadorFinal?: Decimal | null
  cantidadReal?: Decimal | null
  startTime?: Date | null
  endTime?: Date | null
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
  customFuelName?: string
  notes?: string
}

export interface DispatchFormData {
  truckId: number
  driverId: number
  customerId: number
  fuelType: FuelType
  customFuelName?: string
  quantity: number
  locationGPS?: string
  locationManual?: string
  address: string
  scheduledDate: Date
  notes?: string
  priority: number
}

export interface DischargeFormData {
  assignmentId: number
  customerId: number
  totalDischarged: number
  marcadorInicial?: number
  marcadorFinal?: number
}

// Capacity management types
export interface TruckCapacityInfo {
  truck: Truck
  usedPercentage: number
  availableCapacity: number
  isOverCapacity: boolean
  capacityStatus: "low" | "medium" | "high" | "full" | "over"
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

declare module "jsonwebtoken" {
  export interface JwtPayload {
    id: number
    email: string
    role: Role // Use the imported Role enum for type safety
    name: string
    lastname: string
  }
}
