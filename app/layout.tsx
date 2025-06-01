import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext" // Import AuthProvider
import { ToastContainer } from "react-toastify" // For react-toastify
import { Toaster } from "@/components/ui/toaster" // For shadcn/ui toasts
import "react-toastify/dist/ReactToastify.css" // Import react-toastify CSS

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {" "}
            {/* Wrap children with AuthProvider */}
            {children}
            <ToastContainer
              position="bottom-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
            <Toaster /> {/* Shadcn/ui toaster */}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
