"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Extender la definición de tipos para jsPDF
declare module "jspdf" {
  interface jsPDF {
    setGState: (gState: any) => jsPDF
    saveGraphicsState: () => jsPDF
    restoreGraphicsState: () => jsPDF
  }
}

// Tipos mejorados para los datos del PDF
interface BaseItem {
  id: number
  date: string
  truck: string
  driver: string
  fuelType: string
  status: string
  statusClass: string
}

interface DeliveryItem extends BaseItem {
  customer: string
  ruc: string
  allocated: string
  delivered: string
}

interface AssignmentItem extends BaseItem {
  loaded: string
  discharged: string
  remaining: string
}

interface PDFSummary {
  totalFuelAllocated?: string | number
  totalFuelDelivered?: string | number
  totalFuelLoaded?: string | number
  totalFuelDischarged?: string | number
  totalFuelRemaining?: string | number
  completedDeliveries?: number
  totalDeliveries?: number
  completedAssignments?: number
  totalAssignments?: number
  efficiencyPercentage?: string | number
  trucksUsed?: number
  driversActive?: number
  customersServed?: number
  averageFuelPerAssignment?: string | number
  totalDischarges?: number
  completedDischarges?: number
  pendingDischarges?: number
}

interface PDFData {
  title: string
  dateRange: string
  generatedAt: string
  watermark?: string
  summary: PDFSummary
  deliveries?: DeliveryItem[]
  assignments?: AssignmentItem[]
}

interface PDFGeneratorProps {
  data: PDFData
  onComplete: () => void
  type: "deliveries" | "assignments"
}

export function PDFGenerator({ data, onComplete, type }: PDFGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const hasGenerated = useRef(false)

  useEffect(() => {
    // Prevenir múltiples generaciones usando ref
    if (isGenerating || hasGenerated.current) return

    hasGenerated.current = true

    const generatePDF = async () => {
      try {
        setIsGenerating(true)
        const items = type === "deliveries" ? data.deliveries : data.assignments

        if (!items || items.length === 0) {
          toast.error("No hay datos disponibles para generar el PDF.")
          onComplete()
          return
        }

        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        // Agregar marca de agua
        await addWatermark(doc, pageWidth, pageHeight)

        // Configurar título
        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.text(data.title, pageWidth / 2, 25, { align: "center" })

        // Información del reporte
        doc.setFontSize(11)
        doc.setFont("helvetica", "normal")
        doc.text(`Período: ${data.dateRange}`, pageWidth / 2, 35, { align: "center" })
        doc.text(`Generado: ${data.generatedAt}`, pageWidth / 2, 42, { align: "center" })

        let yPosition = 55

        // Resumen ejecutivo
        yPosition = addSummarySection(doc, data.summary, type, yPosition)

        // Tabla de datos
        addDataTable(doc, items, type, yPosition)

        // Agregar numeración de páginas
        addPageNumbers(doc, pageWidth, pageHeight)

        // Generar nombre de archivo único con timestamp
        const timestamp = new Date().getTime()
        const filename = `reporte-${type}-${new Date().toISOString().split("T")[0]}-${timestamp}.pdf`
        doc.save(filename)

        toast.success("PDF generado exitosamente", {
          description: `Archivo: ${filename}`,
        })

        // Pequeño retraso antes de llamar a onComplete para evitar problemas de estado
        setTimeout(() => {
          onComplete()
        }, 100)
      } catch (error) {
        console.error("Error generating PDF:", error)
        toast.error("Error al generar el PDF", {
          description: error instanceof Error ? error.message : "Error desconocido",
        })
        onComplete()
      } finally {
        setIsGenerating(false)
      }
    }

    const addWatermark = async (doc: jsPDF, pageWidth: number, pageHeight: number): Promise<void> => {
      return new Promise((resolve) => {
        try {
          // Primero intentamos usar la marca de agua proporcionada en los datos
          if (data.watermark) {
            console.log("Usando marca de agua desde datos:", data.watermark.substring(0, 50) + "...")
            const watermarkWidth = 120
            const watermarkHeight = 120
            const x = (pageWidth - watermarkWidth) / 2
            const y = (pageHeight - watermarkHeight) / 2

            doc.saveGraphicsState()
            // @ts-ignore - jsPDF types are incomplete for GState
            doc.setGState(new (doc as any).GState({ opacity: 0.3 }))
            doc.addImage(data.watermark, "WEBP", x, y, watermarkWidth, watermarkHeight)
            doc.restoreGraphicsState()
            resolve()
            return
          }

          // Si no hay marca de agua en los datos, intentamos cargar desde URL
          const watermarkUrl = "/assets/watermark.webp"
          console.log("Intentando cargar marca de agua desde:", watermarkUrl)

          const img = new Image()
          img.crossOrigin = "anonymous"

          img.onload = () => {
            console.log("Marca de agua cargada correctamente")
            const canvas = canvasRef.current
            if (!canvas) {
              console.warn("Canvas no disponible para procesar marca de agua")
              createTextWatermark()
              return resolve()
            }

            const ctx = canvas.getContext("2d")
            if (!ctx) {
              console.warn("Contexto 2D no disponible")
              createTextWatermark()
              return resolve()
            }

            // Dibujar la imagen en el canvas
            canvas.width = img.width
            canvas.height = img.height
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(img, 0, 0)

            // Convertir a data URL
            try {
              const watermarkDataUrl = canvas.toDataURL("image/png")

              // Agregar al PDF
              const watermarkWidth = 120
              const watermarkHeight = 120
              const x = (pageWidth - watermarkWidth) / 2
              const y = (pageHeight - watermarkHeight) / 2

              doc.saveGraphicsState()
              // @ts-ignore
              doc.setGState(new (doc as any).GState({ opacity: 0.3 }))
              doc.addImage(watermarkDataUrl, "PNG", x, y, watermarkWidth, watermarkHeight)
              doc.restoreGraphicsState()
              resolve()
            } catch (err) {
              console.error("Error al convertir canvas a dataURL:", err)
              createTextWatermark()
              resolve()
            }
          }

          img.onerror = (err) => {
            console.warn("Error al cargar la marca de agua:", err)
            createTextWatermark()
            resolve()
          }

          img.src = watermarkUrl
        } catch (error) {
          console.warn("Error en proceso de marca de agua:", error)
          createTextWatermark()
          resolve()
        }
      })

      // Función para crear marca de agua de texto como fallback
      function createTextWatermark() {
        console.log("Creando marca de agua de texto como fallback")
        doc.saveGraphicsState()
        // @ts-ignore
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }))
        doc.setFontSize(50)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(200, 200, 200)
        doc.text("PETRUS", pageWidth / 2, pageHeight / 2, {
          align: "center",
          angle: 45,
        })
        doc.restoreGraphicsState()
      }
    }

    const addSummarySection = (doc: jsPDF, summary: PDFSummary, reportType: string, startY: number): number => {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text("Resumen Ejecutivo", 20, startY)

      let yPos = startY + 8
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      const summaryItems =
        reportType === "deliveries"
          ? [
              `Combustible Asignado: ${summary.totalFuelAllocated || 0} galones`,
              `Combustible Entregado: ${summary.totalFuelDelivered || 0} galones`,
              `Entregas: ${summary.completedDeliveries || 0}/${summary.totalDeliveries || 0} completadas`,
              `Eficiencia: ${summary.efficiencyPercentage || 0}%`,
              `Camiones Utilizados: ${summary.trucksUsed || 0}`,
              `Conductores Activos: ${summary.driversActive || 0}`,
              `Clientes Atendidos: ${summary.customersServed || 0}`,
            ]
          : [
              `Combustible Cargado: ${summary.totalFuelLoaded || 0} galones`,
              `Combustible Descargado: ${summary.totalFuelDischarged || 0} galones`,
              `Combustible Remanente: ${summary.totalFuelRemaining || 0} galones`,
              `Asignaciones: ${summary.completedAssignments || 0}/${summary.totalAssignments || 0} completadas`,
              `Eficiencia: ${summary.efficiencyPercentage || 0}%`,
              `Camiones Utilizados: ${summary.trucksUsed || 0}`,
              `Conductores Activos: ${summary.driversActive || 0}`,
              `Total Descargas: ${summary.totalDischarges || 0}`,
            ]

      summaryItems.forEach((item) => {
        doc.text(item, 20, yPos)
        yPos += 5
      })

      return yPos + 10
    }

    const addDataTable = (doc: jsPDF, items: (DeliveryItem | AssignmentItem)[], reportType: string, startY: number) => {
      const headers =
        reportType === "deliveries"
          ? ["Fecha", "Cliente", "RUC", "Camión", "Conductor", "Combustible", "Asignado", "Entregado", "Estado"]
          : ["Fecha", "Camión", "Conductor", "Combustible", "Cargado", "Descargado", "Remanente", "Estado"]

      const body = items.map((item) => {
        if (reportType === "deliveries") {
          const delivery = item as DeliveryItem
          return [
            delivery.date,
            delivery.customer.substring(0, 18),
            delivery.ruc,
            delivery.truck,
            delivery.driver.substring(0, 15),
            delivery.fuelType,
            delivery.allocated,
            delivery.delivered,
            delivery.status,
          ]
        } else {
          const assignment = item as AssignmentItem
          return [
            assignment.date,
            assignment.truck,
            assignment.driver.substring(0, 15),
            assignment.fuelType,
            assignment.loaded,
            assignment.discharged,
            assignment.remaining,
            assignment.status,
          ]
        }
      })

      autoTable(doc, {
        startY,
        head: [headers],
        body,
        theme: "striped",
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        columnStyles: {
          0: { cellWidth: 18 }, // Fecha
          1: { cellWidth: reportType === "deliveries" ? 25 : 20 }, // Cliente/Camión
          2: { cellWidth: reportType === "deliveries" ? 20 : 20 }, // RUC/Conductor
          3: { cellWidth: 15 }, // Camión/Combustible
          4: { cellWidth: 20 }, // Conductor/Cargado
          5: { cellWidth: 15 }, // Combustible/Descargado
          6: { cellWidth: 15 }, // Asignado/Remanente
          7: { cellWidth: 15 }, // Entregado/Estado
          8: { cellWidth: 15 }, // Estado (solo para deliveries)
        },
        margin: { left: 15, right: 15 },
      })
    }

    const addPageNumbers = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
      const totalPages = doc.internal.pages.length - 1

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(128, 128, 128)
        doc.text(`Página ${i} de ${totalPages} - Sistema Petrus Dashboard`, pageWidth / 2, pageHeight - 8, {
          align: "center",
        })
      }
    }

    generatePDF()
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Generando PDF</h3>
        <p className="text-sm text-gray-600">Procesando {type === "deliveries" ? "entregas" : "asignaciones"}...</p>
        <div className="mt-4 bg-gray-100 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" width="400" height="400" />
    </div>
  )
}
