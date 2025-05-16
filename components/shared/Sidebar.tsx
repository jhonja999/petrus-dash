"use client"

import { Truck, Users, Building2, Droplet, BarChart3, Home, Settings, LogOut, Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import {
  Sidebar as SidebarComponent,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { RoleGuard } from "./RoleGuard"
import { Button } from "@/components/ui/button"

export function Sidebar() {
  const pathname = usePathname()

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      active: pathname === "/dashboard",
    },
    {
      href: "/assignment",
      label: "Despachos",
      icon: Droplet,
      active: pathname.includes("/assignment"),
    },
    {
      href: "/trucks",
      label: "Camiones",
      icon: Truck,
      active: pathname.includes("/trucks"),
    },
    {
      href: "/users",
      label: "Usuarios",
      icon: Users,
      active: pathname.includes("/users"),
    },
    {
      href: "/customers",
      label: "Clientes",
      icon: Building2,
      active: pathname.includes("/customers"),
    },
    {
      href: "/reports",
      label: "Reportes",
      icon: BarChart3,
      active: pathname.includes("/reports"),
    },
  ]

  return (
    <SidebarComponent>
      <SidebarHeader className="pb-0">
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex items-center gap-2">
            <Droplet className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-xl">Petrus</span>
          </div>
          <SidebarTrigger className="md:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {routes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <SidebarMenuButton asChild isActive={route.active} tooltip={route.label}>
                <Link href={route.href}>
                  <route.icon className="h-5 w-5" />
                  <span>{route.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <RoleGuard allowedRoles={["admin"]}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.includes("/settings")} tooltip="Configuración">
                <Link href="/settings">
                  <Settings className="h-5 w-5" />
                  <span>Configuración</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </RoleGuard>
          <SidebarMenuItem>
            <div className="flex items-center justify-between px-2 py-2">
              <UserButton afterSignOutUrl="/sign-in" />
              <Link href="/sign-out" className="flex items-center text-red-500 hover:text-red-600">
                <LogOut className="h-5 w-5 mr-2" />
                <span>Salir</span>
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </SidebarComponent>
  )
}

export function SidebarToggle() {
  const { toggleSidebar } = useSidebar()

  return (
    <Button variant="ghost" size="icon" onClick={toggleSidebar} className="fixed top-4 left-4 z-50 md:hidden">
      <Menu className="h-5 w-5" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}
