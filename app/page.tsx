"use client"

import { useEffect, useState } from "react"
import HomePageWrapper from "@/components/HomePageWrapper" // Importa directamente, pero se renderizará condicionalmente

export default function RootPage() {
  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-xl font-bold">Página de inicio</h1>
    </div>
  )
}
