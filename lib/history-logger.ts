import { prisma } from "@/lib/prisma"
import type { HistoryEventType, HistoryEntityType } from "@prisma/client"

interface LogHistoryParams {
  eventType: HistoryEventType
  entityType: HistoryEntityType
  entityId: number
  action: string
  description: string
  userId: number
  metadata?: any
  latitude?: number
  longitude?: number
  address?: string
}

export async function logHistory({
  eventType,
  entityType,
  entityId,
  action,
  description,
  userId,
  metadata,
  latitude,
  longitude,
  address,
}: LogHistoryParams) {
  try {
    await prisma.historyRecord.create({
      data: {
        eventType,
        entityType,
        entityId,
        action,
        description,
        userId,
        metadata,
        latitude,
        longitude,
        address,
      },
    })
  } catch (error) {
    console.error("Error logging history:", error)
    // No lanzar error para no interrumpir el flujo principal
  }
}

// Funciones de conveniencia para eventos comunes
export const HistoryLogger = {
  // Eventos de despacho
  dispatchCreated: (dispatchId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "DISPATCH_CREATED",
      entityType: "DISPATCH",
      entityId: dispatchId,
      action: "Despacho Creado",
      description: `Se creó un nuevo despacho`,
      userId,
      metadata,
    }),

  dispatchStarted: (dispatchId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "DISPATCH_STARTED",
      entityType: "DISPATCH",
      entityId: dispatchId,
      action: "Despacho Iniciado",
      description: `Se inició el despacho`,
      userId,
      metadata,
    }),

  dispatchCompleted: (dispatchId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "DISPATCH_COMPLETED",
      entityType: "DISPATCH",
      entityId: dispatchId,
      action: "Despacho Completado",
      description: `Se completó el despacho exitosamente`,
      userId,
      metadata,
    }),

  // Eventos de asignación
  assignmentCreated: (assignmentId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "ASSIGNMENT_CREATED",
      entityType: "ASSIGNMENT",
      entityId: assignmentId,
      action: "Asignación Creada",
      description: `Se creó una nueva asignación`,
      userId,
      metadata,
    }),

  assignmentCompleted: (assignmentId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "ASSIGNMENT_COMPLETED",
      entityType: "ASSIGNMENT",
      entityId: assignmentId,
      action: "Asignación Completada",
      description: `Se completó la asignación`,
      userId,
      metadata,
    }),

  // Eventos de descarga
  dischargeStarted: (dischargeId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "DISCHARGE_STARTED",
      entityType: "DISCHARGE",
      entityId: dischargeId,
      action: "Descarga Iniciada",
      description: `Se inició la descarga de combustible`,
      userId,
      metadata,
    }),

  dischargeCompleted: (dischargeId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "DISCHARGE_COMPLETED",
      entityType: "DISCHARGE",
      entityId: dischargeId,
      action: "Descarga Completada",
      description: `Se completó la descarga de combustible`,
      userId,
      metadata,
    }),

  // Eventos de camión
  truckLocationUpdate: (truckId: number, userId: number, latitude?: number, longitude?: number, address?: string) =>
    logHistory({
      eventType: "TRUCK_LOCATION_UPDATE",
      entityType: "TRUCK",
      entityId: truckId,
      action: "Ubicación Actualizada",
      description: `Se actualizó la ubicación del camión`,
      userId,
      latitude,
      longitude,
      address,
    }),

  truckMaintenance: (truckId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "TRUCK_MAINTENANCE",
      entityType: "TRUCK",
      entityId: truckId,
      action: "Mantenimiento Programado",
      description: `Se programó mantenimiento para el camión`,
      userId,
      metadata,
    }),

  truckStateChange: (truckId: number, userId: number, metadata?: any) =>
    logHistory({
      eventType: "TRUCK_STATE_CHANGE",
      entityType: "TRUCK",
      entityId: truckId,
      action: "Estado Cambiado",
      description: `Se cambió el estado del camión`,
      userId,
      metadata,
    }),

  // Eventos de usuario
  userLogin: (userId: number) =>
    logHistory({
      eventType: "USER_LOGIN",
      entityType: "USER",
      entityId: userId,
      action: "Inicio de Sesión",
      description: `Usuario inició sesión en el sistema`,
      userId,
    }),

  userLogout: (userId: number) =>
    logHistory({
      eventType: "USER_LOGOUT",
      entityType: "USER",
      entityId: userId,
      action: "Cierre de Sesión",
      description: `Usuario cerró sesión del sistema`,
      userId,
    }),

  // Eventos del sistema
  systemEvent: (description: string, userId: number, metadata?: any) =>
    logHistory({
      eventType: "SYSTEM_EVENT",
      entityType: "SYSTEM",
      entityId: 0,
      action: "Evento del Sistema",
      description,
      userId,
      metadata,
    }),
}
