"use client"

import React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle, MapPin, Truck, FileText, Play } from "lucide-react"
import { CloudinaryUpload } from "./CloudinaryUpload"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

interface ClientAssignment {
  id: number
  customerId: number
  allocatedQuantity: number | string
  deliveredQuantity: number | string
  remainingQuantity: number | string
  status: string
  completedAt?: Date | string | null
  customer: {
    id: number
    companyname: string
    ruc: string
    address?: string
  }
  assignmentId: number
}

interface ExtendedAssignment {
  id: number
  driverId: number
  truckId: number
  fuelType: string
  totalLoaded: number | string
  totalRemaining: number | string
  isCompleted: boolean
  completedAt?: Date | null
  createdAt: Date
  updatedAt: Date
  notes?: string | null
  driver: {
    id: number
    name: string
    lastname: string
  }
  truck: {
    id: number
    placa: string
    capacidad: number
  }
  clientAssignments?: ClientAssignment[]
}

interface MobileDispatchCardProps {
  assignment: ExtendedAssignment
  onUpdate?: () => void
}

const DISPATCH_STAGES = {
  loading_start: {
    label: "Inicio Carga",
    icon: Play,
    color: "bg-blue-500",
    textColor: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  loading_end: {
    label: "Término Carga",
    icon: CheckCircle,
    color: "bg-green-500",
    textColor: "text-green-600",
    bgColor: "bg-green-50",
  },
  delivery: {
    label: "Entrega",
    icon: MapPin,
    color: "bg-orange-500",
    textColor: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  client_confirmation: {
    label: "Conformidad",
    icon: FileText,
    color: "bg-purple-500",
    textColor: "text-purple-600",
    bgColor: "bg-purple-50",
  },
}

export function MobileDispatchCard({ assignment, onUpdate }: MobileDispatchCardProps) {
  const { toast } = useToast()
  const [activeStage, setActiveStage] = useState<string | null>(null)
  const [observations, setObservations] = useState("")
  const [stagePhotos, setStagePhotos] = useState<Record<string, any[]>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  const totalLoaded =
    typeof assignment.totalLoaded === "number"
      ? assignment.totalLoaded
      : Number.parseFloat(String(assignment.totalLoaded || 0))

  const totalRemaining =
    typeof assignment.totalRemaining === "number"
      ? assignment.totalRemaining
      : Number.parseFloat(String(assignment.totalRemaining || 0))

  const progress = totalLoaded > 0 ? ((totalLoaded - totalRemaining) / totalLoaded) * 100 : 0

  const pendingDeliveries = assignment.clientAssignments?.filter((ca) => ca.status === "pending") || []
  const completedDeliveries = assignment.clientAssignments?.filter((ca) => ca.status === "completed") || []

  const handleStagePhotoUpload = (stage: string, files: any[]) => {
    setStagePhotos((prev) => ({
      ...prev,
      [stage]: files,
    }))
  }

  const handleStartStage = (stage: string) => {
    setActiveStage(stage)
    toast({
      title: `${DISPATCH_STAGES[stage as keyof typeof DISPATCH_STAGES]?.label} iniciado`,
      description: "Documenta esta etapa con fotos y observaciones",
    })
  }

  const handleCompleteStage = async (stage: string) => {
    if (!stagePhotos[stage] || stagePhotos[stage].length === 0) {
      toast({
        title: "Fotos requeridas",
        description: "Debes subir al menos una foto para completar esta etapa",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      const photoUrls = stagePhotos[stage].map((photo) => photo.secure_url)

      await axios.post(`/api/assignments/${assignment.id}/stage`, {
        stage,
        photoUrls,
        observations,
        timestamp: new Date().toISOString(),
      })

      toast({
        title: "Etapa completada",
        description: `${DISPATCH_STAGES[stage as keyof typeof DISPATCH_STAGES]?.label} documentado correctamente`,
      })

      setActiveStage(null)
      setObservations("")
      onUpdate?.()
    } catch (error) {
      console.error("Error completing stage:", error)
      toast({
        title: "Error",
        description: "No se pudo completar la etapa",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            <span className="font-bold text-lg">{assignment.truck.placa}</span>
          </div>
          <Badge className="bg-white/20 text-white">{assignment.fuelType}</Badge>
        </div>

        <div className="text-sm opacity-90">
          <p>
            {assignment.driver.name} {assignment.driver.lastname}
          </p>
          <p>
            {totalRemaining.toFixed(0)} / {totalLoaded.toFixed(0)} gal
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="p-4 border-b">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progreso del despacho</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Deliveries */}
      <div className="p-4 space-y-3">
        {/* Pending Deliveries */}
        {pendingDeliveries.map((delivery) => (
          <Card key={delivery.id} className="border-l-4 border-l-orange-500">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm">{delivery.customer.companyname}</p>
                  <p className="text-xs text-gray-500">{delivery.customer.ruc}</p>
                </div>
                <Badge className="bg-orange-100 text-orange-800 text-xs">EN RUTA</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Cantidad:</span>
                <span className="font-medium">{Number(delivery.allocatedQuantity).toFixed(0)} gal</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Completed Deliveries */}
        {completedDeliveries.map((delivery) => (
          <Card key={delivery.id} className="border-l-4 border-l-green-500">
            <CardContent className="p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm">{delivery.customer.companyname}</p>
                  <p className="text-xs text-gray-500">{delivery.customer.ruc}</p>
                </div>
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  COMPLETADO
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Entregado:</span>
                <span className="font-medium text-green-600">{Number(delivery.deliveredQuantity).toFixed(0)} gal</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documentation Stages */}
      <div className="p-4 border-t bg-gray-50">
        <h3 className="font-medium text-sm mb-3">Documentar Despacho</h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(DISPATCH_STAGES).map(([key, stage]) => {
            const Icon = stage.icon
            const isActive = activeStage === key
            const hasPhotos = stagePhotos[key] && stagePhotos[key].length > 0

            return (
              <Button
                key={key}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={`h-auto p-3 flex flex-col items-center gap-1 ${
                  hasPhotos ? "border-green-500 bg-green-50" : ""
                }`}
                onClick={() => handleStartStage(key)}
              >
                <Icon className={`h-4 w-4 ${hasPhotos ? "text-green-600" : ""}`} />
                <span className="text-xs">{stage.label}</span>
                {hasPhotos && <CheckCircle className="h-3 w-3 text-green-600" />}
              </Button>
            )
          })}
        </div>

        {/* Active Stage Documentation */}
        {activeStage && (
          <Card className="border-2 border-blue-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {React.createElement(DISPATCH_STAGES[activeStage as keyof typeof DISPATCH_STAGES].icon, {
                  className: "h-4 w-4 text-blue-600",
                })}
                <span className="font-medium text-sm">
                  {DISPATCH_STAGES[activeStage as keyof typeof DISPATCH_STAGES].label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CloudinaryUpload
                onUpload={(files) => handleStagePhotoUpload(activeStage, files)}
                maxFiles={3}
                folder={`dispatch-${assignment.id}/${activeStage}`}
                tags={[activeStage, `assignment-${assignment.id}`]}
                label="Fotos de la etapa"
                description="Máximo 3 fotos"
                className="text-xs"
              />

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Observaciones</label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Describe lo que está sucediendo..."
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setActiveStage(null)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleCompleteStage(activeStage)}
                  disabled={isProcessing || !stagePhotos[activeStage] || stagePhotos[activeStage].length === 0}
                  className="flex-1"
                >
                  {isProcessing ? "Guardando..." : "Completar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
