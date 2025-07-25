"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { FileText, Download, Printer, MapPin, Truck, User, Calendar, Camera, Clock, Fuel } from "lucide-react"
import { CldImage } from "next-cloudinary"
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

interface DischargeReport {
  valeNumber: string
  fecha: string
  cliente: {
    razonSocial: string
    ruc: string
    direccion: string
  }
  conductor: {
    nombre: string
    email: string
    dni: string
  }
  operario: {
    email: string
  }
  vehiculo: {
    placa: string
    tipoCombustible: string
    capacidad: number
  }
  despacho: {
    cantidad: number
    tipoUnidad: string
    marcadorInicial?: number
    marcadorFinal?: number
    cantidadReal?: number
    kilometraje?: number
    ubicacion?: string
    observaciones?: string
    estado: string
    horaInicio?: string
    horaFin?: string
  }
  fotos: string[]
}

interface DischargeDetailsProps {
  valeNumber: string
  onClose?: () => void
}

export function DischargeDetails({ valeNumber, onClose }: DischargeDetailsProps) {
  const { toast } = useToast()
  const [report, setReport] = useState<DischargeReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchReport()
  }, [valeNumber])

  const fetchReport = async () => {
    try {
      setError(null)
      const response = await axios.get(`/api/reports/discharge/${valeNumber}`)
      setReport(response.data)
    } catch (error: any) {
      console.error("Error fetching report:", error)
      setError(error.response?.data?.error || "Error al cargar el reporte")
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`/api/reports/pdf?valeNumber=${valeNumber}`, {
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: "application/pdf" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${valeNumber}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "PDF descargado",
        description: `Reporte ${valeNumber} descargado exitosamente`,
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo descargar el PDF",
        variant: "destructive",
      })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar el reporte</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <Button onClick={fetchReport}>Reintentar</Button>
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cerrar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vale de Despacho</h1>
          <p className="text-xl text-blue-600 font-mono">{report.valeNumber}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Descargar PDF
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Razón Social</label>
              <p className="text-lg font-semibold">{report.cliente.razonSocial}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">RUC</label>
              <p className="font-mono">{report.cliente.ruc}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Dirección</label>
              <p className="text-gray-700">{report.cliente.direccion}</p>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle and Driver Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Vehículo y Conductor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Placa</label>
              <p className="text-lg font-semibold font-mono">{report.vehiculo.placa}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Conductor</label>
              <p className="font-semibold">{report.conductor.nombre}</p>
              <p className="text-sm text-gray-600">DNI: {report.conductor.dni}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Tipo de Combustible</label>
              <Badge className="bg-orange-100 text-orange-800">{report.vehiculo.tipoCombustible}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dispatch Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-600" />
              Detalles del Despacho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Cantidad Despachada</label>
                  <p className="text-2xl font-bold text-blue-600">
                    {report.despacho.cantidad.toFixed(2)} {report.despacho.tipoUnidad}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Estado</label>
                  <Badge
                    className={
                      report.despacho.estado === "finalizado"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {report.despacho.estado.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {report.despacho.marcadorInicial && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marcador Inicial</label>
                    <p className="font-semibold">{report.despacho.marcadorInicial.toFixed(2)} gal</p>
                  </div>
                )}
                {report.despacho.marcadorFinal && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Marcador Final</label>
                    <p className="font-semibold">{report.despacho.marcadorFinal.toFixed(2)} gal</p>
                  </div>
                )}
                {report.despacho.kilometraje && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Kilometraje</label>
                    <p className="font-semibold">{report.despacho.kilometraje.toFixed(0)} km</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha y Hora</label>
                  <p className="font-semibold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(report.fecha).toLocaleDateString()}
                  </p>
                  {report.despacho.horaInicio && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(report.despacho.horaInicio).toLocaleTimeString()}
                    </p>
                  )}
                </div>
                {report.despacho.ubicacion && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ubicación</label>
                    <p className="text-gray-700 flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {report.despacho.ubicacion}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {report.despacho.observaciones && (
              <>
                <Separator className="my-4" />
                <div>
                  <label className="text-sm font-medium text-gray-500">Observaciones</label>
                  <p className="text-gray-700 mt-1">{report.despacho.observaciones}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Photos */}
        {report.fotos.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-purple-600" />
                Documentación Fotográfica ({report.fotos.length})
              </CardTitle>
              <CardDescription>Evidencia fotográfica del proceso de despacho</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {report.fotos.map((photoUrl, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <CldImage
                        src={photoUrl}
                        alt={`Foto ${index + 1} del despacho ${report.valeNumber}`}
                        width={200}
                        height={200}
                        crop="fill"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={() => window.open(photoUrl, "_blank")}
                      >
                        Ver completa
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-gray-500">
            <p>COMBUSTIBLE PETRUS SAC</p>
            <p>Sistema Integral de Despachos</p>
            <p>Generado el {new Date().toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
