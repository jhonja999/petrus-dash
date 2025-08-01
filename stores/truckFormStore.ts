import { createFormStore, ValidationRules } from './formStore'
import type { FuelType, TruckState } from '@/types/globals'

// Tipos para el formulario de camión
export interface TruckFormData {
  id?: string
  licensePlate: string
  capacity: number
  model: string
  year: number
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  fuelType: FuelType
  customFuelType?: string
  notes?: string
}

// Validaciones específicas para camiones
export const truckValidationRules: ValidationRules<TruckFormData> = {
  licensePlate: {
    required: true,
    minLength: 6,
    maxLength: 10,
    custom: (value: string) => {
      if (!value?.trim()) {
        return 'La placa es requerida'
      }
      if (value.length < 6) {
        return 'La placa debe tener al menos 6 caracteres'
      }
      // Validar formato básico de placa peruana: ABC-123 o ABC123
      const plateRegex = /^[A-Z0-9]{3,4}-?[A-Z0-9]{3,4}$/i
      if (!plateRegex.test(value.trim())) {
        return 'Formato de placa inválido'
      }
      return null
    }
  },
  capacity: {
    required: true,
    min: 1,
    max: 50000,
    custom: (value: number) => {
      if (!value || value <= 0) {
        return 'La capacidad debe ser mayor a 0'
      }
      if (value > 50000) {
        return 'La capacidad no puede exceder 50,000 galones'
      }
      return null
    }
  },
  model: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (!value?.trim()) {
        return 'El modelo es requerido'
      }
      if (value.trim().length < 2) {
        return 'El modelo debe tener al menos 2 caracteres'
      }
      return null
    }
  },
  year: {
    required: true,
    min: 1990,
    max: new Date().getFullYear() + 2,
    custom: (value: number) => {
      const currentYear = new Date().getFullYear()
      if (!value) {
        return 'El año es requerido'
      }
      if (value < 1990) {
        return 'El año no puede ser anterior a 1990'
      }
      if (value > currentYear + 2) {
        return `El año no puede ser mayor a ${currentYear + 2}`
      }
      return null
    }
  },
  status: {
    required: true,
    custom: (value: string) => {
      const validStatuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE']
      if (!validStatuses.includes(value)) {
        return 'Estado inválido'
      }
      return null
    }
  },
  fuelType: {
    required: true,
    custom: (value: FuelType) => {
      const validFuelTypes: FuelType[] = [
        'DIESEL_B5', 'DIESEL_B500', 'GASOLINA_PREMIUM_95', 'GASOLINA_REGULAR_90',
        'GASOHOL_84', 'GASOHOL_90', 'GASOHOL_95', 'SOLVENTE', 'GASOL', 'PERSONALIZADO'
      ]
      if (!validFuelTypes.includes(value)) {
        return 'Tipo de combustible inválido'
      }
      return null
    }
  },
  customFuelType: {
    custom: (value: string | undefined, formData: TruckFormData) => {
      if (formData.fuelType === 'PERSONALIZADO' && (!value || !value.trim())) {
        return 'Debe especificar el tipo de combustible personalizado'
      }
      if (value && value.length > 100) {
        return 'El tipo personalizado no puede exceder 100 caracteres'
      }
      return null
    }
  },
  notes: {
    maxLength: 500,
    custom: (value: string | undefined) => {
      if (value && value.length > 500) {
        return 'Las notas no pueden exceder 500 caracteres'
      }
      return null
    }
  }
}

// Datos iniciales
const initialTruckData: TruckFormData = {
  licensePlate: '',
  capacity: 0,
  model: '',
  year: new Date().getFullYear(),
  status: 'ACTIVE',
  fuelType: 'DIESEL_B5',
  customFuelType: '',
  notes: ''
}

// Crear store de camión con persistencia local
export const useTruckFormStore = createFormStore<TruckFormData>(
  'truck-form', 
  initialTruckData,
  false // Sin persistencia para formularios de edición
)