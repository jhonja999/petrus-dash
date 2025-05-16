"use client"

import { useState } from "react"
import { Bell, Moon, Sun, Shield } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { UserButton } from "@clerk/nextjs"
import { RoleGuard } from "./RoleGuard"
import Link from "next/link"

export function Navbar() {
  const { setTheme } = useTheme()
  const [notifications] = useState(3)

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger className="mr-2" />

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {notifications}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Notificación 1</DropdownMenuItem>
            <DropdownMenuItem>Notificación 2</DropdownMenuItem>
            <DropdownMenuItem>Notificación 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <RoleGuard allowedRoles={["admin"]}>
          <Button variant="outline" size="icon" asChild>
            <Link href="/settings">
              <Shield className="h-5 w-5" />
              <span className="sr-only">Configuración</span>
            </Link>
          </Button>
        </RoleGuard>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Cambiar tema</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>Claro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>Oscuro</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>Sistema</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  )
}
