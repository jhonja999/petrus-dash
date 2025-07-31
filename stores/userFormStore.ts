import { createFormStore, ValidationRules } from './formStore'

// Tipos para el formulario de usuario
export interface UserFormData {
  id?: string
  dni: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: 'ADMIN' | 'DRIVER' | 'OPERATOR'
  status: 'ACTIVE' | 'INACTIVE'
  password?: string
  confirmPassword?: string
  notes?: string
}

// Validaciones específicas para usuarios
export const userValidationRules: ValidationRules<UserFormData> = {
  dni: {
    required: true,
    custom: (value: string) => {
      if (!value) return null
      const dniPattern = /^\d{8}$/
      if (!dniPattern.test(value)) {
        return 'DNI debe tener exactamente 8 dígitos'
      }
      return null
    }
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (!value) return null
      const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
      if (!namePattern.test(value)) {
        return 'El nombre solo puede contener letras y espacios'
      }
      return null
    }
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    custom: (value: string) => {
      if (!value) return null
      const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
      if (!namePattern.test(value)) {
        return 'El apellido solo puede contener letras y espacios'
      }
      return null
    }
  },
  email: {
    required: true,
    custom: (value: string) => {
      if (!value) return null
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(value)) {
        return 'Email inválido'
      }
      return null
    }
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
  role: {
    required: true
  },
  status: {
    required: true
  },
  password: {
    custom: (value: string, formData: UserFormData) => {
      // Solo validar password si es un usuario nuevo o si se está cambiando
      if (!value && !formData.id) {
        return 'La contraseña es requerida para usuarios nuevos'
      }
      if (value && value.length < 6) {
        return 'La contraseña debe tener al menos 6 caracteres'
      }
      if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      }
      return null
    }
  },
  confirmPassword: {
    custom: (value: string, formData: UserFormData) => {
      if (!formData.password) return null
      if (value !== formData.password) {
        return 'Las contraseñas no coinciden'
      }
      return null
    }
  },
  notes: {
    maxLength: 500
  }
}

// Datos iniciales
const initialUserData: UserFormData = {
  dni: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'DRIVER',
  status: 'ACTIVE',
  password: '',
  confirmPassword: '',
  notes: ''
}

// Crear store de usuario
export const useUserFormStore = createFormStore<UserFormData>('user-form', initialUserData) 