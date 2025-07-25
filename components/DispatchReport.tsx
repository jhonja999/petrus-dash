"use client"

import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Button } from "./ui/button"

interface Discharge {
  valeNumber: string
  customer: {
    companyname: string
    ruc: string
    address: string
  }
  totalDischarged: number
  startTime: string
  endTime: string
  marcadorInicial: number
  marcadorFinal: number
  observaciones: string
}

interface DispatchReportProps {
  discharge: Discharge
}

export function DispatchReport({ discharge }: DispatchReportProps) {
  const generatePDF = () => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.text("Reporte de Despacho", 105, 20, { align: "center" })
    doc.setFontSize(12)
    doc.text(`Vale: ${discharge.valeNumber}`, 105, 30, { align: "center" })

    // Customer Info
    doc.setFontSize(14)
    doc.text("Información del Cliente", 20, 50)
    doc.autoTable({
      startY: 55,
      head: [["Empresa", "RUC", "Dirección"]],
      body: [
        [
          discharge.customer.companyname,
          discharge.customer.ruc,
          discharge.customer.address,
        ],
      ],
    })

    // Discharge Info
    doc.setFontSize(14)
    doc.text("Información del Despacho", 20, 90)
    doc.autoTable({
      startY: 95,
      head: [
        [
          "Cantidad Descargada",
          "Inicio",
          "Fin",
          "Marcador Inicial",
          "Marcador Final",
        ],
      ],
      body: [
        [
          `${discharge.totalDischarged} gal`,
          new Date(discharge.startTime).toLocaleString(),
          new Date(discharge.endTime).toLocaleString(),
          discharge.marcadorInicial,
          discharge.marcadorFinal,
        ],
      ],
    })

    // Observations
    if (discharge.observaciones) {
      doc.setFontSize(14)
      doc.text("Observaciones", 20, 130)
      doc.text(discharge.observaciones, 20, 135, {
        maxWidth: 170,
      })
    }

    doc.save(`reporte-${discharge.valeNumber}.pdf`)
  }

  return <Button onClick={generatePDF}>Generar Reporte PDF</Button>
}
