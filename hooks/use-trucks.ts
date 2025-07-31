"use client"

import { useTruckManagementStore } from '@/stores/truckManagementStore'

// ✅ Hook wrapper para mantener compatibilidad con componentes existentes
export function useTrucks() {
  const { 
    trucks, 
    loading: isLoading, 
    error, 
    fetchTrucks, 
    updateTruckState, 
    refreshTrucks 
  } = useTruckManagementStore()

  return {
    trucks,
    isLoading,
    error,
    updateTruckState,
    setTrucks: () => {}, // Mantener compatibilidad pero no usar
    refresh: refreshTrucks
  }
}
