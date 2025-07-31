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
    (field: keyof T) => ({
      value: store.formData[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked 
          : e.target.value
        store.setField(field, value)
        store.validateField(field, validationRules)
      },
      onBlur: () => {
        store.validateField(field, validationRules)
      },
      error: store.errors[field],
      hasError: !!store.errors[field]
    }),
    [store, validationRules]
  )

  const getSelectProps = useCallback(
    (field: keyof T) => ({
      value: store.formData[field],
      onValueChange: (value: string) => {
        store.setField(field, value)
        store.validateField(field, validationRules)
      },
      error: store.errors[field],
      hasError: !!store.errors[field]
    }),
    [store, validationRules]
  )

  const getCheckboxProps = useCallback(
    (field: keyof T) => ({
      checked: store.formData[field] || false,
      onCheckedChange: (checked: boolean) => {
        store.setField(field, checked)
        store.validateField(field, validationRules)
      },
      error: store.errors[field],
      hasError: !!store.errors[field]
    }),
    [store, validationRules]
  )

  const resetForm = useCallback(() => {
    store.resetForm()
  }, [store])

  const setFormData = useCallback((data: Partial<T>) => {
    store.setFormData(data)
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
    validateField: (field: keyof T) => store.validateField(field, validationRules),
    validateForm: () => store.validateForm(validationRules),
    clearError: store.clearError,
    setField: store.setField
  }
} 