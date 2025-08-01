import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tipos base para validaciones
export interface ValidationRule<T = any> {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: T, formData: any) => string | null
}

export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T[K]>
}

// Interface base para el store de formularios
export interface BaseFormStore<T extends Record<string, any>> {
  formData: T
  errors: Record<keyof T, string>
  isSubmitting: boolean
  isDirty: boolean
  
  setField: (field: keyof T, value: any) => void
  setFormData: (data: Partial<T>) => void
  setError: (field: keyof T, error: string) => void
  clearError: (field: keyof T) => void
  clearAllErrors: () => void
  setSubmitting: (submitting: boolean) => void
  setDirty: (dirty: boolean) => void
  clearDirty: () => void
  resetForm: () => void
  validateField: (field: keyof T, rules: ValidationRules<T>) => boolean
  validateForm: (rules: ValidationRules<T>) => boolean
}

// Función para validar un campo individual
export function validateField<T>(
  value: any,
  rule: ValidationRule<T>,
  formData: Record<string, any>
): string | null {
  // Required validation
  if (rule.required) {
    if (value === undefined || value === null || value === '' || 
        (Array.isArray(value) && value.length === 0)) {
      return 'Este campo es requerido'
    }
  }

  // Si el valor está vacío y no es requerido, no validar más
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null
  }

  // Min/Max para números
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return `El valor mínimo es ${rule.min}`
    }
    if (rule.max !== undefined && value > rule.max) {
      return `El valor máximo es ${rule.max}`
    }
  }

  // MinLength/MaxLength para strings
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `Mínimo ${rule.minLength} caracteres`
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `Máximo ${rule.maxLength} caracteres`
    }
  }

  // Pattern validation
  if (rule.pattern && typeof value === 'string') {
    if (!rule.pattern.test(value)) {
      return 'Formato inválido'
    }
  }

  // Custom validation
  if (rule.custom) {
    return rule.custom(value, formData)
  }

  return null
}

// Factory function para crear stores de formularios
export function createFormStore<T extends Record<string, any>>(
  storeName: string,
  initialData: T,
  persist: boolean = false
) {
  const useStore = create<BaseFormStore<T>>()(
    persist ? 
      persistMiddleware(storeName, initialData) :
      baseStore(initialData)
  )

  return useStore
}

// Store base sin persistencia
function baseStore<T extends Record<string, any>>(initialData: T) {
  return (set: any, get: any) => ({
    formData: { ...initialData },
    errors: {} as Record<keyof T, string>,
    isSubmitting: false,
    isDirty: false,

    setField: (field: keyof T, value: any) => {
      set((state: BaseFormStore<T>) => ({
        formData: { ...state.formData, [field]: value },
        isDirty: true
      }))
    },

    setFormData: (data: Partial<T>) => {
      set((state: BaseFormStore<T>) => ({
        formData: { ...state.formData, ...data },
        isDirty: true
      }))
    },

    setError: (field: keyof T, error: string) => {
      set((state: BaseFormStore<T>) => ({
        errors: { ...state.errors, [field]: error }
      }))
    },

    clearError: (field: keyof T) => {
      set((state: BaseFormStore<T>) => {
        const newErrors = { ...state.errors }
        delete newErrors[field]
        return { errors: newErrors }
      })
    },

    clearAllErrors: () => {
      set({ errors: {} as Record<keyof T, string> })
    },

    setSubmitting: (submitting: boolean) => {
      set({ isSubmitting: submitting })
    },

    setDirty: (dirty: boolean) => {
      set({ isDirty: dirty })
    },

    clearDirty: () => {
      set({ isDirty: false })
    },

    resetForm: () => {
      set({
        formData: { ...initialData },
        errors: {} as Record<keyof T, string>,
        isDirty: false,
        isSubmitting: false
      })
    },

    validateField: (field: keyof T, rules: ValidationRules<T>) => {
      const state = get()
      const rule = rules[field]
      if (!rule) return true

      const error = validateField(state.formData[field], rule, state.formData)
      
      if (error) {
        get().setError(field, error)
        return false
      } else {
        get().clearError(field)
        return true
      }
    },

    validateForm: (rules: ValidationRules<T>) => {
      const state = get()
      let isValid = true
      const newErrors: Record<keyof T, string> = {} as Record<keyof T, string>

      // Validar cada campo que tenga reglas
      Object.keys(rules).forEach((fieldKey) => {
        const field = fieldKey as keyof T
        const rule = rules[field]
        if (!rule) return

        const error = validateField(state.formData[field], rule, state.formData)
        if (error) {
          newErrors[field] = error
          isValid = false
        }
      })

      set({ errors: newErrors })
      return isValid
    }
  })
}

// Middleware de persistencia
function persistMiddleware<T extends Record<string, any>>(
  storeName: string,
  initialData: T
) {
  return persist(
    baseStore(initialData),
    {
      name: storeName,
      partialize: (state: BaseFormStore<T>) => ({
        formData: state.formData,
        isDirty: state.isDirty
      })
    }
  )
}