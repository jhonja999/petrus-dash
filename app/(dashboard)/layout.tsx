import type React from "react"
import { Navbar } from "@/components/shared/Navbar"
import { Sidebar, SidebarToggle } from "@/components/shared/Sidebar"
import { requireAuthenticated } from "@/lib/auth"
import { SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Ensure user is authenticated
  await requireAuthenticated()

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <SidebarToggle />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
