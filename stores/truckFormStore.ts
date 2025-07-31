import { createFormStore, ValidationRules } from './formStore'

// Tipos para el formulario de camión
export interface TruckFormData {
  id?: string
  licensePlate: string
  capacity: number
  model: string
  year: number
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  driverId?: string
  fuelType: 'DIESEL' | 'GASOLINE'
  notes?: string
}

// Validaciones específicas para camiones
export const truckValidationRules: ValidationRules<TruckFormData> = {
  licensePlate: {
    required: true,
    minLength: 6,
    maxLength: 10,
    custom: (value: string) => {
      if (!value) return null
      // Validar formato de placa peruana
      const platePattern = /^[A-Z]{2,3}\d{3,4}$/
      if (!platePattern.test(value.toUpperCase())) {
        return 'Formato de placa inválido (ej: ABC123)'
      }
      return null
    }
  },
  capacity: {
    required: true,
    min: 0,
    max: 15000,
    custom: (value: number) => {
      if (value <= 0) {
        return 'La capacidad debe ser mayor a 0'
      }
      if (value > 15000) {
        return 'La capacidad no puede exceder 15000 galones'
      }
      return null
    }
  },
  model: {
    required: true,
    minLength: 2,
    maxLength: 50
  },
  year: {
    required: true,
    min: 1990,
    max: new Date().getFullYear() + 1,
    custom: (value: number) => {
      if (value < 1990) {
        return 'El año debe ser posterior a 1990'
      }
      if (value > new Date().getFullYear() + 1) {
        return 'El año no puede ser futuro'
      }
      return null
    }
  },
  status: {
    required: true
  },
  fuelType: {
    required: true
  },
  notes: {
    maxLength: 500
  }
}

// Datos iniciales
const initialTruckData: TruckFormData = {
  licensePlate: '',
  capacity: 0,
  model: '',
  year: new Date().getFullYear(),
  status: 'ACTIVE',
  fuelType: 'DIESEL',
  notes: ''
}

// Crear store de camión
export const useTruckFormStore = createFormStore<TruckFormData>('truck-form', initialTruckData) 