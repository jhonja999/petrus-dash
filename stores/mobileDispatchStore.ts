import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Tipos para el sistema de despacho móvil
export interface TripLocation {
  lat: number
  lng: number
  timestamp: Date
  accuracy?: number
}

export interface CurrentTrip {
  assignmentId: number
  driverId: number
  startTime: Date
  currentLocation?: TripLocation
  route: TripLocation[]
  isActive: boolean
}

export interface ClientDelivery {
  clientId: number
  status: 'pending' | 'in_progress' | 'completed'
  startTime?: Date
  endTime?: Date
  photos: DeliveryPhoto[]
  observations?: string
  marcadorInicial?: number
  marcadorFinal?: number
  quantityDelivered?: number
}

export interface DeliveryPhoto {
  id: string
  url: string
  type: 'photo'
  stage: 'loading_start' | 'loading_end' | 'delivery' | 'client_confirmation'
  timestamp: Date
  clientId?: number
}

export interface PendingSync {
  id: string
  type: 'location' | 'photo' | 'delivery' | 'trip'
  data: any
  timestamp: Date
  retries: number
}

interface MobileDispatchState {
  // Estado del trayecto actual
  currentTrip: CurrentTrip | null
  
  // Entregas de clientes
  clientDeliveries: Record<number, ClientDelivery>
  
  // Estado de conectividad
  isOnline: boolean
  
  // Cola de sincronización
  pendingSync: PendingSync[]
  
  // Tracking de ubicación
  locationWatchId?: number
  
  // Acciones
  startTrip: (assignmentId: number, driverId: number) => void
  endTrip: () => void
  updateLocation: (lat: number, lng: number) => void
  
  // Gestión de entregas
  startClientDelivery: (clientId: number) => void
  updateClientDelivery: (clientId: number, updates: Partial<ClientDelivery>) => void
  completeClientDelivery: (clientId: number) => void
  
  // Fotos
  addPhotoToDelivery: (clientId: number, photo: DeliveryPhoto) => void
  
  // Validaciones
  validateNextDelivery: (clientId: number) => boolean
  
  // Conectividad
  setOnlineStatus: (isOnline: boolean) => void
  addToSyncQueue: (item: Omit<PendingSync, 'id' | 'timestamp' | 'retries'>) => void
  removeFromSyncQueue: (id: string) => void
  syncWithServer: () => Promise<void>
  
  // Tracking privado
  startLocationTracking: () => void
  stopLocationTracking: () => void
  sendLocationToServer: (lat: number, lng: number) => Promise<void>
  
  // Utilidades
  reset: () => void
}

export const useMobileDispatchStore = create<MobileDispatchState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentTrip: null,
      clientDeliveries: {},
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingSync: [],
      locationWatchId: undefined,

      // Gestión de trayecto
      startTrip: (assignmentId: number, driverId: number) => {
        const trip: CurrentTrip = {
          assignmentId,
          driverId,
          startTime: new Date(),
          route: [],
          isActive: true
        }
        
        set({ currentTrip: trip })
        
        // Agregar a cola de sincronización
        get().addToSyncQueue({
          type: 'trip',
          data: { action: 'start', assignmentId, driverId }
        })
        
        // Iniciar tracking automático
        get().startLocationTracking()
      },

      endTrip: () => {
        const { currentTrip } = get()
        if (!currentTrip) return
        
        // Agregar a cola de sincronización
        get().addToSyncQueue({
          type: 'trip',
          data: { 
            action: 'end', 
            assignmentId: currentTrip.assignmentId,
            endTime: new Date(),
            totalRoute: currentTrip.route
          }
        })
        
        set({ currentTrip: null })
        
        // Detener tracking
        get().stopLocationTracking()
      },

      updateLocation: (lat: number, lng: number) => {
        const { currentTrip } = get()
        if (!currentTrip) return

        const location: TripLocation = {
          lat,
          lng,
          timestamp: new Date(),
          accuracy: undefined
        }

        const updatedTrip = {
          ...currentTrip,
          currentLocation: location,
          route: [...currentTrip.route, location]
        }

        set({ currentTrip: updatedTrip })

        // Agregar a cola de sincronización (solo cada 30 segundos)
        const lastSync = get().pendingSync
          .filter(item => item.type === 'location')
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

        const shouldSync = !lastSync || 
          (new Date().getTime() - lastSync.timestamp.getTime()) > 30000

        if (shouldSync) {
          get().addToSyncQueue({
            type: 'location',
            data: { 
              assignmentId: currentTrip.assignmentId,
              driverId: currentTrip.driverId,
              location
            }
          })
        }
      },

      // Métodos de tracking
      startLocationTracking: () => {
        if (!navigator.geolocation) return

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            get().updateLocation(latitude, longitude)
          },
          (error) => {
            console.error('Error getting location:', error)
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 30000
          }
        )

        set({ locationWatchId: watchId })
      },

      stopLocationTracking: () => {
        const { locationWatchId } = get()
        if (locationWatchId !== undefined) {
          navigator.geolocation.clearWatch(locationWatchId)
          set({ locationWatchId: undefined })
        }
      },

      sendLocationToServer: async (lat: number, lng: number) => {
        const { currentTrip } = get()
        if (!currentTrip) return

        try {
          const response = await fetch(`/api/despacho/${currentTrip.driverId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              assignmentId: currentTrip.assignmentId
            })
          })

          if (!response.ok) {
            console.error('Error sending location to server')
          }
        } catch (error) {
          console.error('Error sending location:', error)
          // Agregar a cola de sincronización si falla
          get().addToSyncQueue({
            type: 'location',
            data: { 
              assignmentId: currentTrip.assignmentId,
              driverId: currentTrip.driverId,
              location: { lat, lng, timestamp: new Date() }
            }
          })
        }
      },

      // Gestión de entregas a clientes
      startClientDelivery: (clientId: number) => {
        set(state => ({
          clientDeliveries: {
            ...state.clientDeliveries,
            [clientId]: {
              clientId,
              status: 'in_progress',
              startTime: new Date(),
              photos: [],
              observations: ''
            }
          }
        }))
      },

      updateClientDelivery: (clientId: number, updates: Partial<ClientDelivery>) => {
        set(state => ({
          clientDeliveries: {
            ...state.clientDeliveries,
            [clientId]: {
              ...state.clientDeliveries[clientId],
              ...updates
            }
          }
        }))
      },

      completeClientDelivery: (clientId: number) => {
        const { clientDeliveries } = get()
        const delivery = clientDeliveries[clientId]
        
        if (!delivery) return

        const completedDelivery = {
          ...delivery,
          status: 'completed' as const,
          endTime: new Date()
        }

        set(state => ({
          clientDeliveries: {
            ...state.clientDeliveries,
            [clientId]: completedDelivery
          }
        }))

        // Agregar a cola de sincronización
        get().addToSyncQueue({
          type: 'delivery',
          data: { 
            action: 'complete',
            clientId,
            delivery: completedDelivery
          }
        })
      },

      // Gestión de fotos
      addPhotoToDelivery: (clientId: number, photo: DeliveryPhoto) => {
        set(state => {
          const delivery = state.clientDeliveries[clientId]
          if (!delivery) return state

          return {
            clientDeliveries: {
              ...state.clientDeliveries,
              [clientId]: {
                ...delivery,
                photos: [...delivery.photos, photo]
              }
            }
          }
        })

        // Agregar a cola de sincronización
        get().addToSyncQueue({
          type: 'photo',
          data: { clientId, photo }
        })
      },

      // Validaciones
      validateNextDelivery: (clientId: number) => {
        const { clientDeliveries } = get()
        
        // Por ahora, permitir cualquier entrega
        // En el futuro se puede implementar lógica de secuencia
        return true
      },

      // Conectividad
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline })
        
        // Si volvemos online, intentar sincronizar
        if (isOnline) {
          setTimeout(() => {
            get().syncWithServer()
          }, 1000)
        }
      },

      addToSyncQueue: (item: Omit<PendingSync, 'id' | 'timestamp' | 'retries'>) => {
        const syncItem: PendingSync = {
          ...item,
          id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          retries: 0
        }

        set(state => ({
          pendingSync: [...state.pendingSync, syncItem]
        }))
      },

      removeFromSyncQueue: (id: string) => {
        set(state => ({
          pendingSync: state.pendingSync.filter(item => item.id !== id)
        }))
      },

      syncWithServer: async () => {
        const { pendingSync, isOnline } = get()
        
        if (!isOnline || pendingSync.length === 0) return

        console.log(`Sincronizando ${pendingSync.length} elementos...`)

        // Procesar cada elemento en la cola
        for (const item of pendingSync) {
          try {
            let endpoint = ''
            let method = 'POST'
            let body = item.data

            switch (item.type) {
              case 'location':
                endpoint = `/api/despacho/${item.data.driverId}/location`
                break
              case 'photo':
                endpoint = `/api/despacho/photos`
                break
              case 'delivery':
                endpoint = `/api/despacho/delivery`
                break
              case 'trip':
                endpoint = `/api/despacho/trip`
                break
              default:
                continue
            }

            const response = await fetch(endpoint, {
              method,
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(body)
            })

            if (response.ok) {
              get().removeFromSyncQueue(item.id)
              console.log(`✅ Sincronizado: ${item.type}`)
            } else {
              throw new Error(`HTTP ${response.status}`)
            }
          } catch (error) {
            console.error(`❌ Error sincronizando ${item.type}:`, error)
            
            // Incrementar reintentos
            set(state => ({
              pendingSync: state.pendingSync.map(syncItem =>
                syncItem.id === item.id
                  ? { ...syncItem, retries: syncItem.retries + 1 }
                  : syncItem
              )
            }))

            // Remover después de 5 reintentos fallidos
            if (item.retries >= 5) {
              get().removeFromSyncQueue(item.id)
              console.log(`🗑️ Removido de cola tras 5 reintentos: ${item.id}`)
            }
          }
        }
      },

      // Utilidades
      reset: () => {
        set({
          currentTrip: null,
          clientDeliveries: {},
          pendingSync: []
        })
      }
    }),
    {
      name: 'mobile-dispatch-storage',
      partialize: (state) => ({
        currentTrip: state.currentTrip,
        clientDeliveries: state.clientDeliveries,
        pendingSync: state.pendingSync
      })
    }
  )
)

// Hook para detectar cambios de conectividad
if (typeof window !== 'undefined') {
  const store = useMobileDispatchStore.getState()
  
  window.addEventListener('online', () => {
    store.setOnlineStatus(true)
  })
  
  window.addEventListener('offline', () => {
    store.setOnlineStatus(false)
  })
}