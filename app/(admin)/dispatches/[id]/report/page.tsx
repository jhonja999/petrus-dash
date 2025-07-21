"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  Download,
  Mail,
  Printer,
  FileText,
  Camera,
  MapPin,
  Calendar,
  User,
  Truck,
  DollarSign,
  FileJson,
  FilePenLineIcon as Signature,
  Eye,
  Upload,
  Check,
  Building2,
  ArrowLeft,
} from "lucide-react"
import axios from "axios"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

interface DispatchReport {
  id: number
  dispatchNumber: string
  year: number
  truckId: number
  driverId: number
  customerId: number
  fuelType: string
  customFuelName?: string
  quantity: number
  deliveryLatitude?: number
  deliveryLongitude?: number
  deliveryAddress: string
  status: string
  priority: string
  scheduledDate: string
  startedAt?: string
  enRouteAt?: string
  completedAt?: string
  notes?: string
  truck: {
    id: number
    placa: string
    typefuel: string
    capacitygal: number
    currentLoad: number
    state: string
  }
  driver: {
    id: number
    name: string
    lastname: string
    email: string
    dni: string
    phone?: string
  }
  customer: {
    id: number
    companyname: string
    ruc: string
    address: string
    phone?: string
    email?: string
  }
  dischargePoints: DischargePoint[]
  photos: ReportPhoto[]
  signatures: ReportSignature[]
  createdAt: string
  updatedAt: string
}

interface DischargePoint {
  id: number
  location: string
  latitude?: number
  longitude?: number
  quantity: number
  startTime: string
  endTime?: string
  initialKm?: number
  finalKm?: number
  status: string
  notes?: string
}

interface ReportPhoto {
  id: number
  url: string
  description: string
  timestamp: string
  location?: string
  type: "loading" | "delivery" | "truck" | "document" | "other"
}

interface ReportSignature {
  id: number
  type: "driver" | "customer" | "operator"
  signatureUrl: string
  signerName: string
  signerDni?: string
  timestamp: string
  ipAddress?: string
}

interface FinancialSummary {
  pricePerGallon: number
  subtotal: number
  igv: number
  total: number
  currency: string
}

const FUEL_TYPE_LABELS = {
  DIESEL_B5: "Diesel B5",
  DIESEL_B500: "Diesel B500",
  GASOLINA_PREMIUM_95: "Gasolina Premium 95",
  GASOLINA_REGULAR_90: "Gasolina Regular 90",
  GASOHOL_84: "Gasohol 84",
  GASOHOL_90: "Gasohol 90",
  GASOHOL_95: "Gasohol 95",
  SOLVENTE: "Solvente Industrial",
  GASOL: "Gasol",
  PERSONALIZADO: "Personalizado",
}

const STATUS_LABELS = {
  PROGRAMADO: "Programado",
  CARGANDO: "Cargando",
  EN_RUTA: "En Ruta",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
}

export default function DispatchReportPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const reportRef = useRef<HTMLDivElement>(null)

  const [dispatch, setDispatch] = useState<DispatchReport | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    pricePerGallon: 12.5,
    subtotal: 0,
    igv: 0,
    total: 0,
    currency: "PEN",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [signatureType, setSignatureType] = useState<"driver" | "customer" | "operator">("driver")
  const [newPhoto, setNewPhoto] = useState<File | null>(null)
  const [photoDescription, setPhotoDescription] = useState("")
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)

  useEffect(() => {
    if (params.id) {
      loadDispatchReport()
    }
  }, [params.id])

  useEffect(() => {
    if (dispatch) {
      calculateFinancialSummary()
    }
  }, [dispatch])

  const loadDispatchReport = async () => {
    try {
      setIsLoading(true)
      const response = await axios.get(`/api/dispatches/${params.id}/report`)

      if (response.data.success) {
        setDispatch(response.data.data)
      }
    } catch (error) {
      console.error("Error loading dispatch report:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar el reporte del despacho",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const calculateFinancialSummary = () => {
    if (!dispatch) return

    const subtotal = Number(dispatch.quantity) * financialSummary.pricePerGallon
    const igv = subtotal * 0.18
    const total = subtotal + igv

    setFinancialSummary((prev) => ({
      ...prev,
      subtotal,
      igv,
      total,
    }))
  }

  const generatePDF = async () => {
    if (!reportRef.current || !dispatch) return

    try {
      setIsGeneratingPDF(true)
      toast({
        title: "Generando PDF",
        description: "Preparando el reporte profesional...",
      })

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const imgWidth = 210
      const pageHeight = 295
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight

      let position = 0

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      pdf.save(`Reporte_${dispatch.dispatchNumber}.pdf`)

      toast({
        title: "PDF generado exitosamente",
        description: `Reporte ${dispatch.dispatchNumber} descargado`,
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el PDF",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const exportToJSON = () => {
    if (!dispatch) return

    const jsonData = {
      dispatch,
      financialSummary,
      exportedAt: new Date().toISOString(),
      format: "PETRUS_DISPATCH_REPORT_V1",
    }

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${dispatch.dispatchNumber}_data.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: "Datos exportados",
      description: "Archivo JSON descargado exitosamente",
    })
  }

  const sendByEmail = async () => {
    if (!dispatch) return

    try {
      await axios.post("/api/dispatches/send-email", {
        dispatchId: dispatch.id,
        recipients: [dispatch.customer.email, dispatch.driver.email].filter(Boolean),
      })

      toast({
        title: "Email enviado",
        description: "Reporte enviado por correo electrónico",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el email",
        variant: "destructive",
      })
    }
  }

  const uploadPhoto = async () => {
    if (!newPhoto || !dispatch) return

    try {
      const formData = new FormData()
      formData.append("photo", newPhoto)
      formData.append("description", photoDescription)
      formData.append("dispatchId", dispatch.id.toString())

      await axios.post("/api/dispatches/photos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      toast({
        title: "Foto agregada",
        description: "La foto se ha agregado al reporte",
      })

      setNewPhoto(null)
      setPhotoDescription("")
      setShowPhotoDialog(false)
      loadDispatchReport()
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo subir la foto",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (!dispatch) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Despacho no encontrado</h2>
          <Button className="mt-4" onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header con acciones */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporte Oficial de Despacho</h1>
            <p className="text-gray-600">
              {dispatch.dispatchNumber} - {format(new Date(dispatch.createdAt), "dd/MM/yyyy", { locale: es })}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={exportToJSON}>
            <FileJson className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" onClick={sendByEmail}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={generatePDF} disabled={isGeneratingPDF}>
            {isGeneratingPDF ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            PDF
          </Button>
        </div>
      </div>

      {/* Reporte oficial */}
      <div ref={reportRef} className="bg-white">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            {/* Header corporativo */}
            <div className="border-b-2 border-blue-600 pb-6 mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-blue-900">PETRUS</h1>
                  <p className="text-lg text-gray-600">Sistema de Gestión de Combustibles</p>
                  <p className="text-sm text-gray-500">RUC: 20123456789 | Lima, Perú</p>
                </div>
                <div className="text-right">
                  <div className="bg-blue-100 px-4 py-2 rounded-lg">
                    <p className="text-2xl font-bold text-blue-900">{dispatch.dispatchNumber}</p>
                    <p className="text-sm text-gray-600">Vale de Despacho</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Basado en formato SO-000028-2024</p>
                </div>
              </div>
            </div>

            {/* Información general en dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Información del cliente */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <Building2 className="inline h-5 w-5 mr-2" />
                  DATOS DEL CLIENTE
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Razón Social:</span>
                    <span className="font-semibold">{dispatch.customer.companyname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">RUC:</span>
                    <span className="font-semibold">{dispatch.customer.ruc}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Dirección:</span>
                    <span className="font-semibold text-right text-sm">{dispatch.customer.address}</span>
                  </div>
                  {dispatch.customer.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Teléfono:</span>
                      <span className="font-semibold">{dispatch.customer.phone}</span>
                    </div>
                  )}
                  {dispatch.customer.email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Email:</span>
                      <span className="font-semibold">{dispatch.customer.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Información del conductor y operario */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <User className="inline h-5 w-5 mr-2" />
                  PERSONAL ASIGNADO
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Conductor:</span>
                    <span className="font-semibold">
                      {dispatch.driver.name} {dispatch.driver.lastname}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">DNI:</span>
                    <span className="font-semibold">{dispatch.driver.dni}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Email:</span>
                    <span className="font-semibold">{dispatch.driver.email}</span>
                  </div>
                  {dispatch.driver.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Teléfono:</span>
                      <span className="font-semibold">{dispatch.driver.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Operario:</span>
                    <span className="font-semibold">Sistema Petrus</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Información del vehículo y fechas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <Truck className="inline h-5 w-5 mr-2" />
                  VEHÍCULO
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Placa:</span>
                    <span className="font-semibold text-lg">{dispatch.truck.placa}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Tipo Unidad:</span>
                    <span className="font-semibold">Camión Cisterna</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Capacidad:</span>
                    <span className="font-semibold">{Number(dispatch.truck.capacitygal).toLocaleString()} gal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Estado:</span>
                    <Badge variant="outline">{dispatch.truck.state}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  <Calendar className="inline h-5 w-5 mr-2" />
                  FECHAS Y HORARIOS
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-medium">Programado:</span>
                    <span className="font-semibold">
                      {format(new Date(dispatch.scheduledDate), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                  {dispatch.startedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Iniciado:</span>
                      <span className="font-semibold text-green-600">
                        {format(new Date(dispatch.startedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                  )}
                  {dispatch.enRouteAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">En Ruta:</span>
                      <span className="font-semibold text-orange-600">
                        {format(new Date(dispatch.enRouteAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                  )}
                  {dispatch.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Completado:</span>
                      <span className="font-semibold text-blue-600">
                        {format(new Date(dispatch.completedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla de detalle de despacho */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                <FileText className="inline h-5 w-5 mr-2" />
                DETALLE DEL DESPACHO
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">No Vale</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Placa</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Cliente</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Cantidad</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Tipo Combustible</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Tipo Unidad</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Hora Despacho</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2 font-mono">{dispatch.dispatchNumber}</td>
                      <td className="border border-gray-300 px-4 py-2 font-semibold">{dispatch.truck.placa}</td>
                      <td className="border border-gray-300 px-4 py-2">{dispatch.customer.companyname}</td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                        {Number(dispatch.quantity).toLocaleString()} gal
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {dispatch.fuelType === "PERSONALIZADO"
                          ? dispatch.customFuelName
                          : FUEL_TYPE_LABELS[dispatch.fuelType as keyof typeof FUEL_TYPE_LABELS]}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Camión Cisterna</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {dispatch.startedAt
                          ? format(new Date(dispatch.startedAt), "HH:mm", { locale: es })
                          : "Pendiente"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Badge variant="outline">{STATUS_LABELS[dispatch.status as keyof typeof STATUS_LABELS]}</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Puntos de descarga con GPS */}
            {dispatch.dischargePoints && dispatch.dischargePoints.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  <MapPin className="inline h-5 w-5 mr-2" />
                  PUNTOS DE DESCARGA CON GPS
                </h3>
                <div className="space-y-4">
                  {dispatch.dischargePoints.map((point, index) => (
                    <div key={point.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="font-semibold">
                            Punto {index + 1}: {point.location}
                          </p>
                          <p className="text-sm text-gray-600">Cantidad: {point.quantity.toLocaleString()} gal</p>
                          {point.latitude && point.longitude && (
                            <p className="text-xs text-gray-500 font-mono">
                              GPS: {point.latitude}, {point.longitude}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-sm">
                            <strong>Inicio:</strong> {format(new Date(point.startTime), "HH:mm", { locale: es })}
                          </p>
                          {point.endTime && (
                            <p className="text-sm">
                              <strong>Fin:</strong> {format(new Date(point.endTime), "HH:mm", { locale: es })}
                            </p>
                          )}
                          {point.initialKm && point.finalKm && (
                            <p className="text-sm">
                              <strong>Kilometraje:</strong> {point.initialKm} - {point.finalKm} km
                            </p>
                          )}
                        </div>
                        <div>
                          <Badge variant="outline">{point.status}</Badge>
                          {point.notes && <p className="text-xs text-gray-600 mt-1">{point.notes}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ubicación principal */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                <MapPin className="inline h-5 w-5 mr-2" />
                UBICACIÓN DE ENTREGA
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">{dispatch.deliveryAddress}</p>
                {dispatch.deliveryLatitude && dispatch.deliveryLongitude && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      Coordenadas GPS: {dispatch.deliveryLatitude}, {dispatch.deliveryLongitude}
                    </p>
                    <a
                      href={`https://www.google.com/maps?q=${dispatch.deliveryLatitude},${dispatch.deliveryLongitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Ver en Google Maps →
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                <DollarSign className="inline h-5 w-5 mr-2" />
                RESUMEN FINANCIERO
              </h3>
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Cantidad:</span>
                      <span className="font-semibold">{Number(dispatch.quantity).toLocaleString()} galones</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Precio por galón:</span>
                      <span className="font-semibold">S/ {financialSummary.pricePerGallon.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Subtotal:</span>
                      <span className="font-semibold">S/ {financialSummary.subtotal.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-700">IGV (18%):</span>
                      <span className="font-semibold">S/ {financialSummary.igv.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 pt-2">
                      <span className="text-lg font-bold text-gray-900">TOTAL FACTURADO:</span>
                      <span className="text-lg font-bold text-blue-600">
                        S/ {financialSummary.total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            {dispatch.notes && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  OBSERVACIONES
                </h3>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{dispatch.notes}</p>
                </div>
              </div>
            )}

            {/* Galería de fotos */}
            {dispatch.photos && dispatch.photos.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  <Camera className="inline h-5 w-5 mr-2" />
                  GALERÍA DE DOCUMENTOS ADJUNTOS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dispatch.photos.map((photo) => (
                    <div key={photo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <img
                        src={photo.url || "/placeholder.svg"}
                        alt={photo.description}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <p className="text-sm font-medium">{photo.description}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(photo.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {photo.type}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Firmas digitales */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
                <Signature className="inline h-5 w-5 mr-2" />
                FIRMAS DIGITALES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Firma del conductor */}
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-300 h-32 flex items-center justify-center mb-2">
                    {dispatch.signatures?.find((s) => s.type === "driver") ? (
                      <img
                        src={dispatch.signatures.find((s) => s.type === "driver")?.signatureUrl || "/placeholder.svg"}
                        alt="Firma del conductor"
                        className="max-h-full max-w-full"
                      />
                    ) : (
                      <p className="text-gray-500 text-sm">Firma del Conductor</p>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {dispatch.driver.name} {dispatch.driver.lastname}
                  </p>
                  <p className="text-xs text-gray-500">Conductor</p>
                </div>

                {/* Firma del cliente */}
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-300 h-32 flex items-center justify-center mb-2">
                    {dispatch.signatures?.find((s) => s.type === "customer") ? (
                      <img
                        src={dispatch.signatures.find((s) => s.type === "customer")?.signatureUrl || "/placeholder.svg"}
                        alt="Firma del cliente"
                        className="max-h-full max-w-full"
                      />
                    ) : (
                      <p className="text-gray-500 text-sm">Firma del Cliente</p>
                    )}
                  </div>
                  <p className="text-sm font-medium">{dispatch.customer.companyname}</p>
                  <p className="text-xs text-gray-500">Cliente</p>
                </div>

                {/* Firma del operario */}
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-300 h-32 flex items-center justify-center mb-2">
                    {dispatch.signatures?.find((s) => s.type === "operator") ? (
                      <img
                        src={dispatch.signatures.find((s) => s.type === "operator")?.signatureUrl || "/placeholder.svg"}
                        alt="Firma del operario"
                        className="max-h-full max-w-full"
                      />
                    ) : (
                      <p className="text-gray-500 text-sm">Firma del Operario</p>
                    )}
                  </div>
                  <p className="text-sm font-medium">Sistema Petrus</p>
                  <p className="text-xs text-gray-500">Operario</p>
                </div>
              </div>
            </div>

            {/* Footer del reporte */}
            <div className="border-t-2 border-gray-200 pt-6 mt-8">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  <p>Reporte generado el {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                  <p>Sistema Petrus Dashboard v1.0 | Formato SO-000028-2024</p>
                </div>
                <div className="text-right">
                  <p>Página 1 de 1</p>
                  <p>ID: {dispatch.id}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Acciones adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full bg-transparent">
              <Camera className="h-4 w-4 mr-2" />
              Agregar Foto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Foto al Reporte</DialogTitle>
              <DialogDescription>Sube una foto relacionada con este despacho</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Foto</Label>
                <Input type="file" accept="image/*" onChange={(e) => setNewPhoto(e.target.files?.[0] || null)} />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={photoDescription}
                  onChange={(e) => setPhotoDescription(e.target.value)}
                  placeholder="Describe la foto..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowPhotoDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={uploadPhoto} disabled={!newPhoto}>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Foto
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full bg-transparent">
              <Signature className="h-4 w-4 mr-2" />
              Firmar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Firma Digital</DialogTitle>
              <DialogDescription>Agrega tu firma digital al reporte</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de Firma</Label>
                <select
                  value={signatureType}
                  onChange={(e) => setSignatureType(e.target.value as "driver" | "customer" | "operator")}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="driver">Conductor</option>
                  <option value="customer">Cliente</option>
                  <option value="operator">Operario</option>
                </select>
              </div>
              <div className="border-2 border-dashed border-gray-300 h-48 flex items-center justify-center">
                <p className="text-gray-500">Área de firma digital</p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
                  Cancelar
                </Button>
                <Button>
                  <Check className="h-4 w-4 mr-2" />
                  Guardar Firma
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="w-full bg-transparent">
          <Eye className="h-4 w-4 mr-2" />
          Vista Previa
        </Button>

        <Button variant="outline" className="w-full bg-transparent">
          <FileText className="h-4 w-4 mr-2" />
          Historial
        </Button>
      </div>
    </div>
  )
}
