import { useCallback } from 'react'
import { BaseFormStore, ValidationRules } from '@/stores/formStore'

export function useFormStore<T extends Record<string, any>>(
  store: BaseFormStore<T>,
  validationRules: ValidationRules<T>
) {
  const handleSubmit = useCallback(
    (onSubmit: (data: T) => Promise<void>) =>
      async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!store.validateForm(validationRules)) {
          return
        }

        store.setSubmitting(true)
        try {
          await onSubmit(store.formData)
          store.clearDirty()
        } catch (error) {
          console.error('Error en submit:', error)
        } finally {
          store.setSubmitting(false)
        }
      },
    [store, validationRules]
  )

  const getFieldProps = useCallback(
    (field: keyof T) => {
      const fieldValue = store.formData[field]
      
      // Handle complex types by converting to appropriate string representation
      let displayValue = ''
      if (fieldValue !== null && fieldValue !== undefined) {
        if (typeof fieldValue === 'object') {
          // For complex objects, don't display them in regular inputs
          displayValue = ''
        } else {
          displayValue = String(fieldValue)
        }
      }

      return {
        value: displayValue,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
          let value: any = e.target.value
          
          // Handle different input types
          if (e.target.type === 'number') {
            value = e.target.value === '' ? 0 : Number(e.target.value)
          } else if (e.target.type === 'checkbox') {
            value = (e.target as HTMLInputElement).checked
          }
          
          store.setField(field, value)
          store.validateField(field, validationRules)
        },
        onBlur: () => {
          store.validateField(field, validationRules)
        }
      }
    },
    [store, validationRules]
  )

  const getSelectProps = useCallback(
    (field: keyof T) => ({
      value: String(store.formData[field] || ''),
      onValueChange: (value: string) => {
        store.setField(field, value)
        store.validateField(field, validationRules)
      }
    }),
    [store, validationRules]
  )

  const getCheckboxProps = useCallback(
    (field: keyof T) => ({
      checked: Boolean(store.formData[field]),
      onCheckedChange: (checked: boolean) => {
        store.setField(field, checked)
        store.validateField(field, validationRules)
      }
    }),
    [store, validationRules]
  )

  const resetForm = useCallback(() => {
    store.resetForm()
  }, [store])

  const setFormData = useCallback((data: Partial<T>) => {
    store.setFormData(data)
  }, [store])

  const setField = useCallback((field: keyof T, value: any) => {
    store.setField(field, value)
  }, [store])

  // Función para establecer datos originales (para formularios de edición)
  const setOriginalData = useCallback((data: T) => {
    if ('setOriginalData' in store && typeof store.setOriginalData === 'function') {
      store.setOriginalData(data)
    }
  }, [store])

  return {
    formData: store.formData,
    errors: store.errors,
    isSubmitting: store.isSubmitting,
    isDirty: store.isDirty,
    handleSubmit,
    getFieldProps,
    getSelectProps,
    getCheckboxProps,
    resetForm,
    setFormData,
    setField,
    setOriginalData,
    validateField: (field: keyof T) => store.validateField(field, validationRules),
    validateForm: () => store.validateForm(validationRules),
    clearError: store.clearError,
    clearAllErrors: store.clearAllErrors
  }
}