import { createFormStore, ValidationRules } from './formStore'
import type { FuelType } from '@/types/globals'

// Tipos para el formulario de asignación
export interface AssignmentFormData {
  id?: string
  truckId: string
  driverId: string
  customerId: string
  fuelType: FuelType
  customFuelType?: string
  quantity: number
  unitPrice: number
  totalAmount: number
  deliveryDate: string
  deliveryTime: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  location?: {
    latitude: number
    longitude: number
    address: string
  }
}

// Validaciones específicas para asignaciones
export const assignmentValidationRules: ValidationRules<AssignmentFormData> = {
  truckId: {
    required: true
  },
  driverId: {
    required: true
  },
  customerId: {
    required: true
  },
  fuelType: {
    required: true
  },
  customFuelType: {
    custom: (value: string, formData: AssignmentFormData) => {
      if (formData.fuelType === 'PERSONALIZADO' && !value?.trim()) {
        return 'Debe especificar el tipo de combustible personalizado'
      }
      return null
    }
  },
  quantity: {
    required: true,
    min: 0.1,
    max: 15000,
    custom: (value: number) => {
      if (value <= 0) {
        return 'La cantidad debe ser mayor a 0'
      }
      if (value > 15000) {
        return 'La cantidad no puede exceder 15000 galones'
      }
      return null
    }
  },
  unitPrice: {
    required: true,
    min: 0,
    max: 100,
    custom: (value: number) => {
      if (value <= 0) {
        return 'El precio unitario debe ser mayor a 0'
      }
      if (value > 100) {
        return 'El precio unitario no puede exceder S/ 100'
      }
      return null
    }
  },
  totalAmount: {
    required: true,
    min: 0,
    custom: (value: number, formData: AssignmentFormData) => {
      if (value <= 0) {
        return 'El monto total debe ser mayor a 0'
      }
      const expectedTotal = formData.quantity * formData.unitPrice
      if (Math.abs(value - expectedTotal) > 0.01) {
        return `El monto total debe ser ${expectedTotal.toFixed(2)}`
      }
      return null
    }
  },
  deliveryDate: {
    required: true,
    custom: (value: string) => {
      if (!value) return null
      const deliveryDate = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (deliveryDate < today) {
        return 'La fecha de entrega no puede ser anterior a hoy'
      }
      return null
    }
  },
  deliveryTime: {
    required: true
  },
  status: {
    required: true
  },
  notes: {
    maxLength: 500
  }
}

// Datos iniciales
const initialAssignmentData: AssignmentFormData = {
  truckId: '',
  driverId: '',
  customerId: '',
  fuelType: 'DIESEL_B5',
  customFuelType: '',
  quantity: 0,
  unitPrice: 0,
  totalAmount: 0,
  deliveryDate: new Date().toISOString().split('T')[0],
  deliveryTime: '08:00',
  status: 'PENDING',
  notes: ''
}

// Crear store de asignación
export const useAssignmentFormStore = createFormStore<AssignmentFormData>('assignment-form', initialAssignmentData) 