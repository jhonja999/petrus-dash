"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, Navigation, ExternalLink } from 'lucide-react'

interface CustomerLocationMapProps {
  latitude: number | string | null
  longitude: number | string | null
  address: string
  companyName: string
}

export function CustomerLocationMap({ 
  latitude, 
  longitude, 
  address, 
  companyName 
}: CustomerLocationMapProps) {
  const [mapUrl, setMapUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (latitude && longitude) {
      const lat = Number(latitude)
      const lng = Number(longitude)
      
      if (!isNaN(lat) && !isNaN(lng)) {
        // Crear URL para Google Maps
        const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
        setMapUrl(googleMapsUrl)
      }
    }
  }, [latitude, longitude])

  const handleOpenMap = () => {
    if (mapUrl) {
      window.open(mapUrl, '_blank')
    }
  }

  const handleGetDirections = () => {
    if (latitude && longitude) {
      const lat = Number(latitude)
      const lng = Number(longitude)
      const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      window.open(directionsUrl, '_blank')
    }
  }

  if (!latitude || !longitude) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sin ubicación registrada
          </h3>
          <p className="text-gray-600 mb-4">
            Este cliente no tiene coordenadas de ubicación configuradas.
          </p>
          <Badge variant="outline" className="text-gray-500">
            Ubicación no disponible
          </Badge>
        </CardContent>
      </Card>
    )
  }

  const lat = Number(latitude)
  const lng = Number(longitude)

  if (isNaN(lat) || isNaN(lng)) {
    return (
      <Card className="border-dashed border-red-300">
        <CardContent className="p-6 text-center">
          <MapPin className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Coordenadas inválidas
          </h3>
          <p className="text-red-600 mb-4">
            Las coordenadas registradas no son válidas.
          </p>
          <Badge variant="outline" className="text-red-500">
            Error en coordenadas
          </Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          Ubicación del Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Información de coordenadas */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-900">Latitud:</span>
              <p className="text-blue-700 font-mono">{lat.toFixed(6)}</p>
            </div>
            <div>
              <span className="font-medium text-blue-900">Longitud:</span>
              <p className="text-blue-700 font-mono">{lng.toFixed(6)}</p>
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Dirección:</h4>
          <p className="text-gray-700 text-sm">{address}</p>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={handleOpenMap}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver en Maps
          </Button>
          <Button
            onClick={handleGetDirections}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Navigation className="h-4 w-4 mr-2" />
            Cómo llegar
          </Button>
        </div>

        {/* Preview del mapa (iframe) */}
        <div className="mt-4">
          <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
            <iframe
              src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${lat},${lng}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Ubicación de ${companyName}`}
            />
          </div>
        </div>

        {/* Información adicional */}
        <div className="text-xs text-gray-500 text-center">
          <p>Estas coordenadas se utilizan para el tracking y navegación durante las entregas.</p>
        </div>
      </CardContent>
    </Card>
  )
} 