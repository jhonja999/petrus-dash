import type { Decimal } from "@prisma/client/runtime/library"
import type { UserRole, UserState, FuelType, TruckState } from "@prisma/client"

// Extend the global Window object if needed for client-side properties
declare global {
  interface Window {
    // Add any global window properties here if necessary
  }
}

export interface User {
  id: number
  email: string
  name: string
  lastname: string
  role: UserRole // Use Prisma's UserRole enum
  state: UserState // Use Prisma's UserState enum
  dni: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export interface Truck {
  id: number
  placa: string
  typefuel: FuelType
  capacitygal: number
  lastRemaining: number
  state: TruckState
}

export interface Assignment {
  id: number
  truckId: number
  driverId: number
  totalLoaded: number
  totalRemaining: number
  fuelType: FuelType
  isCompleted: boolean
  notes?: string | null
  truck: Truck // Include relations if always fetched
  driver: User // Include relations if always fetched
  discharges: Discharge[]
  createdAt: Date
  updatedAt: Date
}

export interface Discharge {
  id: number
  assignmentId: number
  customerId: number
  totalDischarged: number
  status: string
  marcadorInicial?: number | null
  marcadorFinal?: number | null
  cantidadReal?: number | null
  assignment: Assignment // Include relations if always fetched
  customer: Customer // Include relations if always fetched
  createdAt: Date
  updatedAt: Date
}

export interface Customer {
  id: number
  companyname: string
  ruc: string
  address: string
}

export interface DailyAssignmentSummary {
  assignment: Assignment
  totalDischarges: number
  completedDischarges: number
  remainingFuel: Decimal
  previousDayRemaining: Decimal
  totalAvailableFuel: number
}
