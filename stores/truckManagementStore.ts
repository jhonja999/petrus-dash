import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';
import type { FuelType, TruckState as TruckStateEnum } from '@/types/globals';

// Re-export types that components might need
export type { FuelType, TruckStateEnum };

// Internal interfaces
export interface TruckState {
  id: number;
  currentFuel: number;
  fuelType: string;
  assignedDriver: number | null;
  maintenanceStatus: 'none' | 'scheduled' | 'in_progress' | 'completed';
  location: { lat: number; lng: number } | null;
  lastActivity: Date;
}

export interface TruckFilters {
  state: TruckStateEnum | 'all'
  fuelType: FuelType | 'all'
  searchTerm: string
  assignedOnly: boolean
}

// Define una interfaz Truck local para el store
export interface StoreTruck {
  id: number;
  placa: string;
  typefuel: FuelType;
  capacitygal: number;
  lastRemaining: number;
  state: TruckStateEnum;
  createdAt?: string;
  updatedAt?: string;
  driver?: {
    id: number;
    name: string;
    lastname: string;
    dni: string;
  };
}

interface TruckManagementStore {
  // Estado principal
  trucks: StoreTruck[]
  loading: boolean
  error: string | null
  lastUpdated: Date | null
  
  // Estados dinámicos por camión
  truckStates: Record<number, TruckState>
  
  // Filtros y búsqueda
  filters: TruckFilters
  
  // Acciones principales
  fetchTrucks: () => Promise<void>
  updateTruck: (id: number, updates: Partial<StoreTruck>) => Promise<void>
  updateTruckState: (id: number, state: TruckStateEnum) => Promise<void>
  updateFuelLevel: (id: number, remaining: number) => Promise<void>
  assignDriver: (truckId: number, driverId: number) => Promise<void>
  unassignDriver: (truckId: number) => Promise<void>
  
  // Filtros y búsqueda
  setFilter: (key: keyof TruckFilters, value: any) => void
  clearFilters: () => void
  
  // Getters computados
  getActiveTrucks: () => StoreTruck[]
  getAvailableTrucks: () => StoreTruck[]
  getTrucksByState: (state: TruckStateEnum) => StoreTruck[]
  getTrucksByFuelType: (fuelType: FuelType) => StoreTruck[]
  getFilteredTrucks: () => StoreTruck[]
  
  // Sincronización
  syncWithAssignments: () => Promise<void>
  refreshTrucks: () => Promise<void>
  
  // Utilidades
  validateTruckData: (data: any) => StoreTruck[]
  handleApiError: (error: any, context: string) => string
  
  // Validaciones de negocio
  validateStateChange: (truck: StoreTruck, newState: TruckStateEnum) => boolean
  validateFuelLevel: (truck: StoreTruck, newLevel: number) => boolean
}


type State = {
  trucks: StoreTruck[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  truckStates: Record<number, TruckState>;
  filters: TruckFilters;
}

type Actions = {
  // Acciones principales
  fetchTrucks: () => Promise<void>;
  updateTruck: (id: number, updates: Partial<StoreTruck>) => Promise<void>;
  updateTruckState: (id: number, state: TruckStateEnum) => Promise<void>;
  updateFuelLevel: (id: number, remaining: number) => Promise<void>;
  assignDriver: (truckId: number, driverId: number) => Promise<void>;
  unassignDriver: (truckId: number) => Promise<void>;
  
  // Filtros y búsqueda
  setFilter: (key: keyof TruckFilters, value: any) => void;
  clearFilters: () => void;
  
  // Getters computados
  getActiveTrucks: () => StoreTruck[];
  getAvailableTrucks: () => StoreTruck[];
  getTrucksByState: (state: TruckStateEnum) => StoreTruck[];
  getTrucksByFuelType: (fuelType: FuelType) => StoreTruck[];
  getFilteredTrucks: () => StoreTruck[];
  
  // Sincronización
  syncWithAssignments: () => Promise<void>;
  refreshTrucks: () => Promise<void>;
  
  // Utilidades
  validateTruckData: (data: any) => StoreTruck[];
  handleApiError: (error: any, context: string) => string;
  
  // Validaciones de negocio
  validateStateChange: (truck: StoreTruck, newState: TruckStateEnum) => boolean;
  validateFuelLevel: (truck: StoreTruck, newLevel: number) => boolean;
}

type Store = State & Actions;

const createTruckManagementStore = () =>
  create<Store>()(
    devtools(
      persist(
        (set, get) => ({
          // Estado inicial
          trucks: [] as StoreTruck[],
          loading: false,
          error: null,
          lastUpdated: null,
          truckStates: {} as Record<number, TruckState>,
          filters: {
            state: 'all',
            fuelType: 'all',
            searchTerm: '',
            assignedOnly: false
          } as TruckFilters,

          // Validación de datos
          validateTruckData: (data: any): StoreTruck[] => {
            if (!Array.isArray(data)) {
              console.warn('⚠️ TruckManagementStore: Data is not an array:', data)
              return []
            }

            return data.map((truck: any) => ({
              id: truck.id || 0,
              placa: truck.placa || '',
              typefuel: truck.typefuel || 'DIESEL_B5',
              capacitygal: Number(truck.capacitygal) || 0,
              lastRemaining: Number(truck.lastRemaining) || 0,
              state: truck.state || 'Activo',
              createdAt: truck.createdAt ? new Date(truck.createdAt).toISOString() : undefined,
              updatedAt: truck.updatedAt ? new Date(truck.updatedAt).toISOString() : undefined
            }))
          },

          // Manejo de errores
          handleApiError: (error: any, context: string): string => {
            console.error(`Error in ${context}:`, error)
            
            if (axios.isAxiosError(error)) {
              console.error(`🔍 Detailed error info for ${context}:`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                url: error.config?.url,
                method: error.config?.method
              })
              
            if (error.response?.status === 404) {
                return `${context}: Recurso no encontrado`
              }
              if (error.response && typeof error.response.status === 'number' && error.response.status >= 500) {
                return `${context}: Error del servidor (${error.response.status}) - ${error.response.data?.error || 'Error interno'}`
              }
              return error.response?.data?.error || `${context}: Error desconocido`
            }
            
            return `${context}: Error de conexión`
          },

          // Acciones principales
          fetchTrucks: async () => {
            try {
              set({ loading: true, error: null })
              
              const response = await axios.get('/api/trucks')
              const trucksData = response.data?.data || response.data || []
              
              const validatedTrucks = get().validateTruckData(trucksData)
              
              set({ 
                trucks: validatedTrucks,
                loading: false,
                lastUpdated: new Date(),
                error: null
              })
              
              console.log(`✅ TruckManagementStore: Loaded ${validatedTrucks.length} trucks`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'fetchTrucks')
              set({ 
                trucks: [],
                loading: false,
                error: errorMessage
              })
            }
          },

          updateTruck: async (id: number, updates: Partial<StoreTruck>) => {
            try {
              const response = await axios.put(`/api/trucks/${id}`, updates)
              const updatedTruck = response.data
              
              set(state => ({
                trucks: state.trucks.map(truck => 
                  truck.id === id ? { ...truck, ...updatedTruck } : truck
                ),
                lastUpdated: new Date()
              }))
              
              console.log(`✅ TruckManagementStore: Updated truck ${id}`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'updateTruck')
              set({ error: errorMessage })
            }
          },

          updateTruckState: async (id: number, state: TruckStateEnum) => {
            try {
              await get().updateTruck(id, { state })
              
              // Actualizar estado dinámico
              set(state => ({
                truckStates: {
                  ...state.truckStates,
                  [id]: {
                    ...state.truckStates[id],
                    lastActivity: new Date()
                  }
                }
              }))
              
              console.log(`✅ TruckManagementStore: Updated truck ${id} state to ${state}`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'updateTruckState')
              set({ error: errorMessage })
            }
          },

          updateFuelLevel: async (id: number, remaining: number) => {
            try {
              await get().updateTruck(id, { lastRemaining: remaining })
              set(state => ({
                truckStates: {
                  ...state.truckStates,
                  [id]: {
                    ...state.truckStates[id],
                    currentFuel: remaining,
                    lastActivity: new Date()
                  }
                }
              }))
              
              console.log(`✅ TruckManagementStore: Updated truck ${id} fuel to ${remaining}`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'updateFuelLevel')
              set({ error: errorMessage })
            }
          },

          assignDriver: async (truckId: number, driverId: number) => {
            try {
              set(state => ({
                truckStates: {
                  ...state.truckStates,
                  [truckId]: {
                    ...state.truckStates[truckId],
                    assignedDriver: driverId,
                    lastActivity: new Date()
                  }
                }
              }))
              
              console.log(`✅ TruckManagementStore: Assigned driver ${driverId} to truck ${truckId}`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'assignDriver')
              set({ error: errorMessage })
            }
          },

          unassignDriver: async (truckId: number) => {
            try {
              set(state => ({
                truckStates: {
                  ...state.truckStates,
                  [truckId]: {
                    ...state.truckStates[truckId],
                    assignedDriver: null,
                    lastActivity: new Date()
                  }
                }
              }))
              
              console.log(`✅ TruckManagementStore: Unassigned driver from truck ${truckId}`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'unassignDriver')
              set({ error: errorMessage })
            }
          },

          // Filtros y búsqueda
          setFilter: (key: keyof TruckFilters, value: any) => {
            set(state => ({
              filters: {
                ...state.filters,
                [key]: value
              }
            }))
          },

          clearFilters: () => {
            set({
              filters: {
                state: 'all',
                fuelType: 'all',
                searchTerm: '',
                assignedOnly: false
              }
            })
          },

          // Getters computados
          getActiveTrucks: (): StoreTruck[] => {
            const { trucks } = get()
            return trucks.filter((truck: StoreTruck) => truck.state === 'Activo' as TruckStateEnum)
          },

          getAvailableTrucks: (): StoreTruck[] => {
            const { trucks } = get()
            return trucks.filter((truck: StoreTruck) => 
              truck.state === 'Activo' && 
              truck.lastRemaining > 0
            )
          },

          getTrucksByState: (state: TruckStateEnum): StoreTruck[] => {
            const { trucks } = get()
            return trucks.filter((truck: StoreTruck) => truck.state === state)
          },

          getTrucksByFuelType: (fuelType: FuelType): StoreTruck[] => {
            const { trucks } = get()
            return trucks.filter((truck: StoreTruck) => truck.typefuel === fuelType)
          },

          getFilteredTrucks: () => {
            const { trucks, filters } = get()
            
            return trucks.filter(truck => {
              // Filtro por estado
              if (filters.state !== 'all' && truck.state !== filters.state) {
                return false
              }
              
              // Filtro por tipo de combustible
              if (filters.fuelType !== 'all' && truck.typefuel !== filters.fuelType) {
                return false
              }
              
              // Filtro por búsqueda
              if (filters.searchTerm && !truck.placa.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
                return false
              }
              
              // Filtro por asignación
              if (filters.assignedOnly && truck.state !== 'Asignado' as TruckStateEnum) {
                return false
              }
              
              return true
            })
          },

          // Sincronización
          syncWithAssignments: async () => {
            try {
              const response = await axios.get('/api/assignments?active=true')
              const activeAssignments = response.data?.assignments || []
              
              // Actualizar estados de camiones basado en asignaciones
              for (const assignment of activeAssignments) {
                if (!assignment.isCompleted) {
                  await get().updateTruckState(assignment.truckId, 'Asignado' as TruckStateEnum)
                  await get().assignDriver(assignment.truckId, assignment.driverId)
                } else {
                  await get().updateTruckState(assignment.truckId, 'Activo' as TruckStateEnum)
                  await get().unassignDriver(assignment.truckId)
                }
              }
              
              console.log(`✅ TruckManagementStore: Synced with ${activeAssignments.length} assignments`)
            } catch (error) {
              const errorMessage = get().handleApiError(error, 'syncWithAssignments')
              console.warn(errorMessage)
            }
          },

          refreshTrucks: async () => {
            await get().fetchTrucks()
            await get().syncWithAssignments()
          },

          // Validaciones de negocio
          validateStateChange: (truck: StoreTruck, newState: TruckStateEnum): boolean => {
            // No permitir cambiar estado si está en asignación activa
            if (truck.state === 'Asignado' as TruckStateEnum && newState !== 'Activo' as TruckStateEnum) {
              return false
            }
            
            // No permitir asignar si está en mantenimiento
            if (truck.state === 'Mantenimiento' as TruckStateEnum && newState === 'Asignado' as TruckStateEnum) {
              return false
            }
            
            // No permitir cambiar a activo si tiene combustible crítico
            if (newState === 'Activo' as TruckStateEnum) {
              const fuelPercentage = (truck.lastRemaining / truck.capacitygal) * 100
              if (fuelPercentage < 5) {
                return false
              }
            }
            
            return true
          },

          validateFuelLevel: (truck: StoreTruck, newLevel: number): boolean => {
            // No permitir combustible negativo
            if (newLevel < 0) {
              return false
            }
            
            // No permitir exceder la capacidad
            if (newLevel > Number(truck.capacitygal)) {
              return false
            }
            
            return true
          }
        }),
        {
          name: 'truck-management-store',
          partialize: (state) => ({
            trucks: state.trucks,
            truckStates: state.truckStates,
            filters: state.filters,
            lastUpdated: state.lastUpdated
          })
        }
      ),
      { name: 'truck-management-store' }
    )
  )

export const useTruckManagementStore = createTruckManagementStore()