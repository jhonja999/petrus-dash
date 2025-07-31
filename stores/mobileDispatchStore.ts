import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface UploadedFile {
  id: string
  url: string
  type: 'photo' | 'document'
  stage: 'loading_start' | 'loading_end' | 'delivery' | 'client_confirmation'
  timestamp: Date
  clientId?: number
}

export interface ClientDelivery {
  clientId: number
  status: 'pending' | 'in_progress' | 'completed'
  photos: UploadedFile[]
  observations: string
  startTime?: Date
  endTime?: Date
  marcadorInicial?: number
  marcadorFinal?: number
  quantityDelivered?: number
  clientSignature?: string
}

export interface TripData {
  id: string
  assignmentId: number
  driverId: number
  status: 'idle' | 'started' | 'in_delivery' | 'completed'
  startTime?: Date
  endTime?: Date
  currentLocation: { lat: number; lng: number } | null
  route: Array<{ lat: number; lng: number; timestamp: Date }>
  totalDistance?: number
  estimatedTime?: number
}

export interface PendingSync {
  id: string
  type: 'delivery_complete' | 'trip_start' | 'trip_end' | 'location_update'
  data: any
  timestamp: Date
  retries: number
}

interface MobileDispatchStore {
  // Estado de entregas por cliente
  clientDeliveries: Record<string, ClientDelivery>
  
  // Estado de trayecto actual
  currentTrip: TripData | null
  
  // Estado de conexión
  isOnline: boolean
  lastSync: Date | null
  
  // Cola de sincronización
  pendingSync: PendingSync[]
  
  // Configuración
  autoTracking: boolean
  syncInterval: number
  
  // Acciones de trayecto
  startTrip: (assignmentId: number, driverId: number) => void
  endTrip: () => void
  updateLocation: (lat: number, lng: number) => void
  
  // Acciones de entregas
  updateClientDelivery: (clientId: number, data: Partial<ClientDelivery>) => void
  completeClientDelivery: (clientId: number) => void
  addPhotoToDelivery: (clientId: number, photo: UploadedFile) => void
  removePhotoFromDelivery: (clientId: number, photoId: string) => void
  
  // Acciones de sincronización
  setOnlineStatus: (isOnline: boolean) => void
  addToPendingSync: (type: PendingSync['type'], data: any) => void
  removeFromPendingSync: (id: string) => void
  syncWithServer: () => Promise<void>
  
  // Utilidades
  getCurrentDelivery: () => ClientDelivery | null
  getCompletedDeliveries: () => ClientDelivery[]
  getPendingDeliveries: () => ClientDelivery[]
  validateNextDelivery: (clientId: number) => boolean
  resetTrip: () => void
}

const createMobileDispatchStore = () =>
  create<MobileDispatchStore>()(
    devtools(
      persist(
        (set, get) => ({
          // Estado inicial
          clientDeliveries: {},
          currentTrip: null,
          isOnline: navigator.onLine,
          lastSync: null,
          pendingSync: [],
          autoTracking: true,
          syncInterval: 30000, // 30 segundos

          // Acciones de trayecto
          startTrip: (assignmentId: number, driverId: number) => {
            const tripData: TripData = {
              id: `trip_${Date.now()}`,
              assignmentId,
              driverId,
              status: 'started',
              startTime: new Date(),
              currentLocation: null,
              route: []
            }
            
            set({ currentTrip: tripData })
            
            // Agregar a cola de sincronización
            get().addToPendingSync('trip_start', {
              assignmentId,
              driverId,
              startTime: tripData.startTime
            })
            
            // Iniciar tracking automático si está habilitado
            if (get().autoTracking) {
              get().startLocationTracking()
            }
          },

          endTrip: () => {
            const { currentTrip } = get()
            if (!currentTrip) return

            const updatedTrip = {
              ...currentTrip,
              status: 'completed' as const,
              endTime: new Date()
            }
            
            set({ currentTrip: updatedTrip })
            
            // Agregar a cola de sincronización
            get().addToPendingSync('trip_end', {
              tripId: currentTrip.id,
              endTime: updatedTrip.endTime,
              totalDistance: currentTrip.totalDistance,
              route: currentTrip.route
            })
            
            // Detener tracking
            get().stopLocationTracking()
          },

          updateLocation: (lat: number, lng: number) => {
            const { currentTrip } = get()
            if (!currentTrip || currentTrip.status === 'idle') return

            const locationPoint = { lat, lng, timestamp: new Date() }
            const updatedTrip = {
              ...currentTrip,
              currentLocation: { lat, lng },
              route: [...currentTrip.route, locationPoint]
            }
            
            set({ currentTrip: updatedTrip })
            
            // Agregar a cola de sincronización
            get().addToPendingSync('location_update', {
              tripId: currentTrip.id,
              lat,
              lng,
              timestamp: locationPoint.timestamp
            })
          },

          // Acciones de entregas
          updateClientDelivery: (clientId: number, data: Partial<ClientDelivery>) => {
            const { clientDeliveries } = get()
            const existing = clientDeliveries[clientId] || {
              clientId,
              status: 'pending',
              photos: [],
              observations: ''
            }
            
            const updated = { ...existing, ...data }
            set({
              clientDeliveries: {
                ...clientDeliveries,
                [clientId]: updated
              }
            })
          },

          completeClientDelivery: (clientId: number) => {
            const { clientDeliveries } = get()
            const delivery = clientDeliveries[clientId]
            if (!delivery) return

            const updated = {
              ...delivery,
              status: 'completed' as const,
              endTime: new Date()
            }
            
            set({
              clientDeliveries: {
                ...clientDeliveries,
                [clientId]: updated
              }
            })
            
            // Agregar a cola de sincronización
            get().addToPendingSync('delivery_complete', {
              clientId,
              delivery: updated
            })
          },

          addPhotoToDelivery: (clientId: number, photo: UploadedFile) => {
            const { clientDeliveries } = get()
            const delivery = clientDeliveries[clientId]
            if (!delivery) return

            const updated = {
              ...delivery,
              photos: [...delivery.photos, { ...photo, clientId }]
            }
            
            set({
              clientDeliveries: {
                ...clientDeliveries,
                [clientId]: updated
              }
            })
          },

          removePhotoFromDelivery: (clientId: number, photoId: string) => {
            const { clientDeliveries } = get()
            const delivery = clientDeliveries[clientId]
            if (!delivery) return

            const updated = {
              ...delivery,
              photos: delivery.photos.filter(p => p.id !== photoId)
            }
            
            set({
              clientDeliveries: {
                ...clientDeliveries,
                [clientId]: updated
              }
            })
          },

          // Acciones de sincronización
          setOnlineStatus: (isOnline: boolean) => {
            set({ isOnline })
            if (isOnline) {
              // Intentar sincronizar cuando se recupera la conexión
              get().syncWithServer()
            }
          },

          addToPendingSync: (type: PendingSync['type'], data: any) => {
            const pending: PendingSync = {
              id: `sync_${Date.now()}_${Math.random()}`,
              type,
              data,
              timestamp: new Date(),
              retries: 0
            }
            
            set(state => ({
              pendingSync: [...state.pendingSync, pending]
            }))
          },

          removeFromPendingSync: (id: string) => {
            set(state => ({
              pendingSync: state.pendingSync.filter(p => p.id !== id)
            }))
          },

          syncWithServer: async () => {
            const { pendingSync, isOnline } = get()
            if (!isOnline || pendingSync.length === 0) return

            const syncPromises = pendingSync.map(async (pending) => {
              try {
                const response = await fetch(`/api/mobile/sync`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: pending.type,
                    data: pending.data,
                    timestamp: pending.timestamp
                  })
                })

                if (response.ok) {
                  get().removeFromPendingSync(pending.id)
                } else {
                  // Incrementar contador de reintentos
                  set(state => ({
                    pendingSync: state.pendingSync.map(p => 
                      p.id === pending.id 
                        ? { ...p, retries: p.retries + 1 }
                        : p
                    )
                  }))
                }
              } catch (error) {
                console.error('Error syncing:', error)
                // Incrementar contador de reintentos
                set(state => ({
                  pendingSync: state.pendingSync.map(p => 
                    p.id === pending.id 
                      ? { ...p, retries: p.retries + 1 }
                      : p
                  )
                }))
              }
            })

            await Promise.all(syncPromises)
            set({ lastSync: new Date() })
          },

          // Utilidades
          getCurrentDelivery: () => {
            const { clientDeliveries } = get()
            return Object.values(clientDeliveries).find(d => d.status === 'in_progress') || null
          },

          getCompletedDeliveries: () => {
            const { clientDeliveries } = get()
            return Object.values(clientDeliveries).filter(d => d.status === 'completed')
          },

          getPendingDeliveries: () => {
            const { clientDeliveries } = get()
            return Object.values(clientDeliveries).filter(d => d.status === 'pending')
          },

          validateNextDelivery: (clientId: number) => {
            const { clientDeliveries } = get()
            const deliveries = Object.values(clientDeliveries)
            
            // Verificar que no hay entregas en progreso
            const inProgress = deliveries.find(d => d.status === 'in_progress')
            if (inProgress) return false
            
            // Verificar que todas las entregas anteriores están completadas
            const pending = deliveries.filter(d => d.status === 'pending')
            const completed = deliveries.filter(d => d.status === 'completed')
            
            // Si hay entregas pendientes, solo permitir la primera
            if (pending.length > 0) {
              const firstPending = pending[0]
              return firstPending.clientId === clientId
            }
            
            return true
          },

          resetTrip: () => {
            set({
              currentTrip: null,
              clientDeliveries: {},
              pendingSync: []
            })
          },

          // Métodos privados para tracking
          startLocationTracking: () => {
            if (!navigator.geolocation) return

            const watchId = navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude } = position.coords
                get().updateLocation(latitude, longitude)
                
                // Enviar ubicación al servidor cada 3-5 minutos
                get().sendLocationToServer(latitude, longitude)
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

            // Guardar el ID del watcher para poder detenerlo
            set({ locationWatchId: watchId })
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
            }
          },

          stopLocationTracking: () => {
            const { locationWatchId } = get()
            if (locationWatchId) {
              navigator.geolocation.clearWatch(locationWatchId)
              set({ locationWatchId: undefined })
            }
          }
        }),
        {
          name: 'mobile-dispatch-store',
          partialize: (state) => ({
            clientDeliveries: state.clientDeliveries,
            currentTrip: state.currentTrip,
            pendingSync: state.pendingSync,
            autoTracking: state.autoTracking
          })
        }
      ),
      { name: 'mobile-dispatch-store' }
    )
  )

export const useMobileDispatchStore = createMobileDispatchStore() 