"use client"

import { MapPin, ExternalLink } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Decimal } from "@prisma/client/runtime/library"

interface LocationDisplayProps {
  latitude?: Decimal | null
  longitude?: Decimal | null
  companyName: string
}

export function LocationDisplay({ latitude, longitude, companyName }: LocationDisplayProps) {
  if (!latitude || !longitude) {
    return (
      <Badge variant="secondary" className="text-xs">
        Sin ubicación
      </Badge>
    )
  }

  const lat = parseFloat(latitude.toString())
  const lng = parseFloat(longitude.toString())

  const openInMaps = () => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`
    window.open(url, '_blank')
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-gray-600">
        <MapPin className="h-3 w-3" />
        <span>{lat.toFixed(4)}, {lng.toFixed(4)}</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={openInMaps}
        className="h-6 w-6 p-0 hover:bg-blue-50"
        title={`Ver ubicación de ${companyName} en Google Maps`}
      >
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  )
}