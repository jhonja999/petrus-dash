import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// Tipos base para el store de formularios
export interface BaseFormStore<T> {
  formData: T
  errors: Record<keyof T, string>
  isSubmitting: boolean
  isDirty: boolean
  originalData: T | null
  
  // Acciones
  setField: (field: keyof T, value: any) => void
  setFormData: (data: Partial<T>) => void
  setErrors: (errors: Partial<Record<keyof T, string>>) => void
  clearError: (field: keyof T) => void
  resetForm: () => void
  setSubmitting: (isSubmitting: boolean) => void
  validateField: (field: keyof T, validationRules: ValidationRules<T>) => boolean
  validateForm: (validationRules: ValidationRules<T>) => boolean
  setOriginalData: (data: T) => void
  markAsDirty: () => void
  clearDirty: () => void
}

// Reglas de validación
export interface ValidationRules<T> {
  [K in keyof T]?: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    min?: number
    max?: number
    custom?: (value: any, formData: T) => string | null
  }
}

// Validadores centralizados
export const validators = {
  required: (value: any): string | null => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'Este campo es requerido'
    }
    return null
  },

  minLength: (value: string, min: number): string | null => {
    if (value && value.length < min) {
      return `Mínimo ${min} caracteres`
    }
    return null
  },

  maxLength: (value: string, max: number): string | null => {
    if (value && value.length > max) {
      return `Máximo ${max} caracteres`
    }
    return null
  },

  pattern: (value: string, pattern: RegExp, message: string): string | null => {
    if (value && !pattern.test(value)) {
      return message
    }
    return null
  },

  min: (value: number, min: number): string | null => {
    if (value !== undefined && value < min) {
      return `Valor mínimo: ${min}`
    }
    return null
  },

  max: (value: number, max: number): string | null => {
    if (value !== undefined && value > max) {
      return `Valor máximo: ${max}`
    }
    return null
  },

  // Validadores específicos del dominio
  ruc: (value: string): string | null => {
    if (!value) return null
    const rucPattern = /^\d{11}$/
    if (!rucPattern.test(value)) {
      return 'RUC debe tener 11 dígitos'
    }
    return null
  },

  dni: (value: string): string | null => {
    if (!value) return null
    const dniPattern = /^\d{8}$/
    if (!dniPattern.test(value)) {
      return 'DNI debe tener 8 dígitos'
    }
    return null
  },

  email: (value: string): string | null => {
    if (!value) return null
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(value)) {
      return 'Email inválido'
    }
    return null
  },

  coordinates: (value: string): string | null => {
    if (!value) return null
    const coord = parseFloat(value)
    if (isNaN(coord) || coord < -90 || coord > 90) {
      return 'Coordenada inválida (-90 a 90)'
    }
    return null
  },

  truckCapacity: (value: number): string | null => {
    if (value < 0 || value > 15000) {
      return 'Capacidad debe estar entre 0 y 15000 galones'
    }
    return null
  },

  licensePlate: (value: string): string | null => {
    if (!value) return null
    if (value.length < 6) {
      return 'Placa debe tener al menos 6 caracteres'
    }
    return null
  }
}

// Función para crear un store de formulario genérico
export function createFormStore<T extends Record<string, any>>(
  storeName: string,
  initialData: T
) {
  return create<BaseFormStore<T>>()(
    devtools(
      persist(
        (set, get) => ({
          formData: initialData,
          errors: {} as Record<keyof T, string>,
          isSubmitting: false,
          isDirty: false,
          originalData: null,

          setField: (field: keyof T, value: any) => {
            set((state) => ({
              formData: { ...state.formData, [field]: value },
              isDirty: true,
              errors: { ...state.errors, [field]: '' }
            }))
          },

          setFormData: (data: Partial<T>) => {
            set((state) => ({
              formData: { ...state.formData, ...data },
              isDirty: true
            }))
          },

          setErrors: (errors: Partial<Record<keyof T, string>>) => {
            set((state) => ({
              errors: { ...state.errors, ...errors }
            }))
          },

          clearError: (field: keyof T) => {
            set((state) => ({
              errors: { ...state.errors, [field]: '' }
            }))
          },

          resetForm: () => {
            set((state) => ({
              formData: state.originalData || initialData,
              errors: {},
              isDirty: false,
              isSubmitting: false
            }))
          },

          setSubmitting: (isSubmitting: boolean) => {
            set({ isSubmitting })
          },

          validateField: (field: keyof T, validationRules: ValidationRules<T>) => {
            const state = get()
            const value = state.formData[field]
            const rules = validationRules[field]

            if (!rules) return true

            let error: string | null = null

            // Aplicar validaciones en orden
            if (rules.required) {
              error = validators.required(value)
            }

            if (!error && rules.minLength && typeof value === 'string') {
              error = validators.minLength(value, rules.minLength)
            }

            if (!error && rules.maxLength && typeof value === 'string') {
              error = validators.maxLength(value, rules.maxLength)
            }

            if (!error && rules.pattern && typeof value === 'string') {
              error = validators.pattern(value, rules.pattern, 'Formato inválido')
            }

            if (!error && rules.min && typeof value === 'number') {
              error = validators.min(value, rules.min)
            }

            if (!error && rules.max && typeof value === 'number') {
              error = validators.max(value, rules.max)
            }

            if (!error && rules.custom) {
              error = rules.custom(value, state.formData)
            }

            // Actualizar errores
            set((state) => ({
              errors: { ...state.errors, [field]: error || '' }
            }))

            return !error
          },

          validateForm: (validationRules: ValidationRules<T>) => {
            const state = get()
            let isValid = true
            const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>

            // Validar todos los campos
            Object.keys(validationRules).forEach((field) => {
              const fieldKey = field as keyof T
              const value = state.formData[fieldKey]
              const rules = validationRules[fieldKey]

              if (!rules) return

              let error: string | null = null

              if (rules.required) {
                error = validators.required(value)
              }

              if (!error && rules.minLength && typeof value === 'string') {
                error = validators.minLength(value, rules.minLength)
              }

              if (!error && rules.maxLength && typeof value === 'string') {
                error = validators.maxLength(value, rules.maxLength)
              }

              if (!error && rules.pattern && typeof value === 'string') {
                error = validators.pattern(value, rules.pattern, 'Formato inválido')
              }

              if (!error && rules.min && typeof value === 'number') {
                error = validators.min(value, rules.min)
              }

              if (!error && rules.max && typeof value === 'number') {
                error = validators.max(value, rules.max)
              }

              if (!error && rules.custom) {
                error = rules.custom(value, state.formData)
              }

              if (error) {
                newErrors[fieldKey] = error
                isValid = false
              }
            })

            set({ errors: newErrors })
            return isValid
          },

          setOriginalData: (data: T) => {
            set({ originalData: data })
          },

          markAsDirty: () => {
            set({ isDirty: true })
          },

          clearDirty: () => {
            set({ isDirty: false })
          }
        }),
        {
          name: `${storeName}-form-store`,
          partialize: (state) => ({
            formData: state.formData,
            originalData: state.originalData
          })
        }
      ),
      { name: storeName }
    )
  )
} 