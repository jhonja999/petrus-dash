"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Truck,
  MapPin,
  Camera,
  Navigation,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Fuel,
  User,
  Zap,
  Wifi,
  WifiOff,
  Battery,
  Signal
} from "lucide-react"
import { toast } from "sonner"

interface MobileDriverAppProps {
  driverId: number
  driverName: string
  driverEmail: string
}

export function MobileDriverApp({ driverId, driverName, driverEmail }: MobileDriverAppProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [battery, setBattery] = useState(100)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [dispatches, setDispatches] = useState<any[]>([])
  const [activeDispatch, setActiveDispatch] = useState<any>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Conexión restaurada", { duration: 2000 })
    }
    const handleOffline = () => {
      setIsOnline(false)
      toast.error("Sin conexión - Modo offline activado", { duration: 3000 })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get GPS location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error("GPS error:", error)
          toast.error("Error al obtener ubicación GPS")
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )

      return () => navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  // Mock battery API
  useEffect(() => {
    // @ts-ignore - Battery API is experimental
    if ('getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((battery) => {
        setBattery(Math.round(battery.level * 100))
        
        battery.addEventListener('levelchange', () => {
          setBattery(Math.round(battery.level * 100))
        })
      })
    }
  }, [])

  const handleEmergency = () => {
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200])
    }
    
    toast.error("🚨 EMERGENCIA ACTIVADA", {
      description: "Notificando a central de operaciones...",
      duration: 5000
    })
    
    // In production, send emergency signal to backend
  }

  const handlePhotoCapture = (type: string) => {
    // In production, open camera or file picker
    toast.info(`📸 Capturando foto: ${type}`)
  }

  const shareLocation = () => {
    if (location) {
      const url = `https://maps.google.com/?q=${location.lat},${location.lng}`
      if (navigator.share) {
        navigator.share({
          title: 'Mi ubicación actual',
          text: `Estoy en: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
          url: url
        })
      } else {
        navigator.clipboard.writeText(url)
        toast.success("Ubicación copiada al portapapeles")
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Status Bar */}
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-mono">
            {currentTime.toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-300" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Signal className="h-4 w-4" />
          <div className="flex items-center gap-1">
            <Battery className="h-4 w-4" />
            <span>{battery}%</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{driverName}</p>
              <p className="text-xs text-gray-600">{driverEmail}</p>
            </div>
          </div>
          <Badge className={isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
            {isOnline ? "En línea" : "Sin conexión"}
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Current Vehicle Info */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Camión Asignado</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800">ABC-001</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Combustible:</p>
                <p className="font-medium">Diesel B5</p>
              </div>
              <div>
                <p className="text-gray-600">Capacidad:</p>
                <p className="font-medium">8,500 gal</p>
              </div>
              <div>
                <p className="text-gray-600">Carga Actual:</p>
                <p className="font-medium text-green-600">6,200 gal</p>
              </div>
              <div>
                <p className="text-gray-600">Disponible:</p>
                <p className="font-medium text-orange-600">2,300 gal</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Nivel de combustible</span>
                <span>73%</span>
              </div>
              <Progress value={73} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Active Dispatch */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Despacho Activo</CardTitle>
              <Badge className="bg-green-100 text-green-800">
                <Clock className="h-3 w-3 mr-1" />
                EN_RUTA
              </Badge>
            </div>
            <CardDescription className="font-mono text-lg">PE-000123-2025</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Cliente:</p>
                <p className="font-medium">Transportes ABC S.A.C.</p>
              </div>
              <div>
                <p className="text-gray-600">Cantidad:</p>
                <p className="font-medium">1,500 gal</p>
              </div>
              <div>
                <p className="text-gray-600">Combustible:</p>
                <p className="font-medium">Diesel B5</p>
              </div>
              <div>
                <p className="text-gray-600">Hora programada:</p>
                <p className="font-medium">14:30</p>
              </div>
            </div>

            {/* Location */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-800">Ubicación de entrega</span>
                <Button size="sm" variant="outline" onClick={shareLocation}>
                  <Navigation className="h-3 w-3 mr-1" />
                  Compartir
                </Button>
              </div>
              {location ? (
                <p className="text-xs text-blue-600 font-mono">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              ) : (
                <p className="text-xs text-blue-600">Obteniendo ubicación...</p>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso de entrega</span>
                <span>2 de 3 completadas</span>
              </div>
              <Progress value={67} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="h-16 flex-col gap-1"
            onClick={() => handlePhotoCapture("ENTREGA")}
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs">Foto Entrega</span>
          </Button>
          
          <Button 
            className="h-16 flex-col gap-1"
            onClick={() => handlePhotoCapture("ODOMETRO")}
            variant="outline"
          >
            <Fuel className="h-5 w-5" />
            <span className="text-xs">Odómetro</span>
          </Button>
          
          <Button 
            className="h-16 flex-col gap-1"
            onClick={shareLocation}
            variant="outline"
          >
            <MapPin className="h-5 w-5" />
            <span className="text-xs">Ubicación</span>
          </Button>
          
          <Button 
            className="h-16 flex-col gap-1"
            onClick={() => handlePhotoCapture("CONFORMIDAD_CLIENTE")}
            variant="outline"
          >
            <CheckCircle className="h-5 w-5" />
            <span className="text-xs">Conformidad</span>
          </Button>
        </div>

        {/* Pending Dispatches */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Próximos Despachos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-mono">PE-00012{3 + i}-2025</Badge>
                  <Badge className="bg-gray-100 text-gray-800">PROGRAMADO</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-600">Cliente:</p>
                    <p className="font-medium">Cliente {i + 1}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Cantidad:</p>
                    <p className="font-medium">{800 + i * 200} gal</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Offline Mode Alert */}
        {!isOnline && (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Modo offline activado. Los datos se sincronizarán cuando se restaure la conexión.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Emergency Button */}
      <div className="fixed bottom-4 right-4">
        <Button
          onClick={handleEmergency}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg"
        >
          <AlertTriangle className="h-6 w-6 text-white" />
        </Button>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="grid grid-cols-3 gap-1 p-2">
          <Button variant="ghost" className="flex-col gap-1 h-12">
            <FileText className="h-4 w-4" />
            <span className="text-xs">Despachos</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-12">
            <Camera className="h-4 w-4" />
            <span className="text-xs">Fotos</span>
          </Button>
          <Button variant="ghost" className="flex-col gap-1 h-12">
            <MapPin className="h-4 w-4" />
            <span className="text-xs">Ubicación</span>
          </Button>
        </div>
      </div>
    </div>
  )
}