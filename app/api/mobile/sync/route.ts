// app/api/mobile/sync/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyAuth } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await verifyAuth(request)
    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { type, data, timestamp } = await request.json()

    switch (type) {
      case 'trip_start':
        return await handleTripStart(data, authResult.user.id)
      
      case 'trip_end':
        return await handleTripEnd(data, authResult.user.id)
      
      case 'location_update':
        return await handleLocationUpdate(data, authResult.user.id)
      
      case 'delivery_complete':
        return await handleDeliveryComplete(data, authResult.user.id)
      
      default:
        return NextResponse.json(
          { error: "Tipo de sincronización no válido" },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error("Error en sync endpoint:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

async function handleTripStart(data: any, driverId: number) {
  const { assignmentId, startTime } = data

  // Verificar que la asignación existe y pertenece al conductor
  const assignment = await prisma.assignment.findFirst({
    where: {
      id: parseInt(assignmentId),
      driverId: driverId
    }
  })

  if (!assignment) {
    return NextResponse.json(
      { error: "Asignación no encontrada" },
      { status: 404 }
    )
  }

  // Actualizar asignación (sin campo status por ahora)
  const existingNotes = typeof assignment.notes === 'string' ? JSON.parse(assignment.notes) : (assignment.notes || {})
  
  await prisma.assignment.update({
    where: { id: parseInt(assignmentId) },
    data: {
      // status: 'IN_PROGRESS', // Comentado hasta actualizar schema
      tripStartTime: new Date(startTime),
      notes: JSON.stringify({
        ...existingNotes,
        tripStarted: true,
        tripStartTime: startTime,
        status: 'IN_PROGRESS' // Guardamos en notes por ahora
      })
    }
  })

  // Crear registro de trayecto
  const trip = await prisma.trip.create({
    data: {
      assignmentId: parseInt(assignmentId),
      driverId: driverId,
      startTime: new Date(startTime),
      status: 'IN_PROGRESS',
      route: [],
      totalDistance: 0
    }
  })

  return NextResponse.json({
    success: true,
    message: "Trayecto sincronizado correctamente",
    tripId: trip.id
  })
}

async function handleTripEnd(data: any, driverId: number) {
  const { tripId, endTime, totalDistance, route } = data

  // Actualizar trayecto
  await prisma.trip.updateMany({
    where: {
      id: parseInt(tripId),
      driverId: driverId
    },
    data: {
      endTime: new Date(endTime),
      status: 'COMPLETED',
      totalDistance: totalDistance || 0,
      route: route || []
    }
  })

  // Obtener el trayecto para actualizar la asignación
  const trip = await prisma.trip.findFirst({
    where: { id: parseInt(tripId) },
    include: { assignment: true }
  })

  if (trip) {
    const existingNotes = typeof trip.assignment.notes === 'string' ? JSON.parse(trip.assignment.notes) : (trip.assignment.notes || {})
    
    await prisma.assignment.update({
      where: { id: trip.assignmentId },
      data: {
        // status: 'COMPLETED', // Comentado hasta actualizar schema
        tripEndTime: new Date(endTime),
        notes: JSON.stringify({
          ...existingNotes,
          tripCompleted: true,
          tripEndTime: endTime,
          totalDistance: totalDistance || 0,
          status: 'COMPLETED' // Guardamos en notes por ahora
        })
      }
    })
  }

  return NextResponse.json({
    success: true,
    message: "Fin de trayecto sincronizado correctamente"
  })
}

async function handleLocationUpdate(data: any, driverId: number) {
  const { tripId, lat, lng, timestamp } = data

  // Verificar que el trayecto existe y pertenece al conductor
  const trip = await prisma.trip.findFirst({
    where: {
      id: parseInt(tripId),
      driverId: driverId
    }
  })

  if (!trip) {
    return NextResponse.json(
      { error: "Trayecto no encontrado" },
      { status: 404 }
    )
  }

  // Crear registro de ubicación
  await prisma.driverLocation.create({
    data: {
      driverId: driverId,
      latitude: lat,
      longitude: lng,
      timestamp: new Date(timestamp),
      tripId: parseInt(tripId)
    }
  })

  // Actualizar ruta del trayecto - Fixed the spread operator issue
  const currentRoute = Array.isArray(trip.route) ? trip.route : []
  const newRoute = [...currentRoute, { lat, lng, timestamp }]

  await prisma.trip.update({
    where: { id: parseInt(tripId) },
    data: {
      route: newRoute
    }
  })

  return NextResponse.json({
    success: true,
    message: "Ubicación sincronizada correctamente"
  })
}

async function handleDeliveryComplete(data: any, driverId: number) {
  const { clientId, delivery } = data

  // Verificar que la entrega pertenece a una asignación del conductor
  const assignment = await prisma.assignment.findFirst({
    where: {
      driverId: driverId,
      clientAssignments: {
        some: {
          customerId: clientId
        }
      }
      // status: { in: ['IN_PROGRESS', 'COMPLETED'] } // Comentado hasta actualizar schema
    },
    include: {
      clientAssignments: {
        where: {
          customerId: clientId
        }
      }
    }
  })

  if (!assignment) {
    return NextResponse.json(
      { error: "Entrega no encontrada" },
      { status: 404 }
    )
  }

  // Actualizar notas de la asignación con la información de la entrega
  const currentNotes = typeof assignment.notes === 'string' ? JSON.parse(assignment.notes) : (assignment.notes || {})
  const existingDeliveries = currentNotes.deliveries || {}
  
  const updatedNotes = {
    ...currentNotes,
    deliveries: {
      ...existingDeliveries,
      [clientId]: {
        status: delivery.status,
        photos: delivery.photos,
        observations: delivery.observations,
        startTime: delivery.startTime,
        endTime: delivery.endTime,
        marcadorInicial: delivery.marcadorInicial,
        marcadorFinal: delivery.marcadorFinal,
        quantityDelivered: delivery.quantityDelivered,
        clientSignature: delivery.clientSignature
      }
    }
  }

  await prisma.assignment.update({
    where: { id: assignment.id },
    data: {
      notes: JSON.stringify(updatedNotes)
    }
  })

  // Si hay fotos, procesarlas
  if (delivery.photos && delivery.photos.length > 0) {
    for (const photo of delivery.photos) {
      console.log(`Foto procesada: ${photo.url} para cliente ${clientId}`)
    }
  }

  return NextResponse.json({
    success: true,
    message: "Entrega sincronizada correctamente"
  })
}