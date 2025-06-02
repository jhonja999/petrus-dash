import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"
import { ToastContainer } from "react-toastify" // For react-toastify
import "react-toastify/dist/ReactToastify.css" // react-toastify styles
import { Toaster } from "@/components/ui/toaster" // For shadcn/ui toasts

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Petrus - Sistema de Gestión",
  description: "Sistema de gestión de despachos de combustible",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <Toaster /> {/* shadcn/ui toaster */}
        </AuthProvider>
      </body>
    </html>
  )
}
