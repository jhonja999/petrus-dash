import { createFormStore, ValidationRules } from './formStore'

// Tipos para el formulario de cliente
export interface CustomerFormData {
  id?: string
  name: string
  ruc: string
  address: string
  phone: string
  email?: string
  contactPerson: string
  latitude?: number
  longitude?: number
  notes?: string
  status: 'ACTIVE' | 'INACTIVE'
}

// Validaciones específicas para clientes
export const customerValidationRules: ValidationRules<CustomerFormData> = {
  name: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value) return null
      const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
      if (!namePattern.test(value)) {
        return 'El nombre solo puede contener letras y espacios'
      }
      return null
    }
  },
  ruc: {
    required: true,
    custom: (value: string) => {
      if (!value) return null
      const rucPattern = /^\d{11}$/
      if (!rucPattern.test(value)) {
        return 'RUC debe tener exactamente 11 dígitos'
      }
      return null
    }
  },
  address: {
    required: true,
    minLength: 10,
    maxLength: 200
  },
  phone: {
    required: true,
    minLength: 9,
    maxLength: 15,
    custom: (value: string) => {
      if (!value) return null
      const phonePattern = /^[\d\s\-\+\(\)]+$/
      if (!phonePattern.test(value)) {
        return 'Formato de teléfono inválido'
      }
      return null
    }
  },
  email: {
    custom: (value: string) => {
      if (!value) return null
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(value)) {
        return 'Email inválido'
      }
      return null
    }
  },
  contactPerson: {
    required: true,
    minLength: 2,
    maxLength: 100,
    custom: (value: string) => {
      if (!value) return null
      const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
      if (!namePattern.test(value)) {
        return 'El nombre de contacto solo puede contener letras y espacios'
      }
      return null
    }
  },
  latitude: {
    custom: (value: number) => {
      if (value === undefined || value === null) return null
      if (value < -90 || value > 90) {
        return 'Latitud debe estar entre -90 y 90'
      }
      return null
    }
  },
  longitude: {
    custom: (value: number) => {
      if (value === undefined || value === null) return null
      if (value < -180 || value > 180) {
        return 'Longitud debe estar entre -180 y 180'
      }
      return null
    }
  },
  notes: {
    maxLength: 500
  },
  status: {
    required: true
  }
}

// Datos iniciales
const initialCustomerData: CustomerFormData = {
  name: '',
  ruc: '',
  address: '',
  phone: '',
  email: '',
  contactPerson: '',
  notes: '',
  status: 'ACTIVE'
}

// Crear store de cliente
export const useCustomerFormStore = createFormStore<CustomerFormData>('customer-form', initialCustomerData) 