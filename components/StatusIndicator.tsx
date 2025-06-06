"use client"

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatusIndicatorProps {
  isRefreshing: boolean
  lastRefresh?: Date | null
  variant?: "default" | "minimal" | "dot"
  className?: string
}

export function StatusIndicator({ isRefreshing, lastRefresh, variant = "default", className }: StatusIndicatorProps) {
  // Only show when refreshing for minimal variant
  if (variant === "minimal" && !isRefreshing) {
    return null
  }

  // Format last refresh time
  const formattedTime = lastRefresh
    ? new Intl.DateTimeFormat("es", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(lastRefresh)
    : "Nunca"

  // Different styles based on variant
  if (variant === "dot") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center", className)}>
              <div
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  isRefreshing ? "bg-blue-500 animate-pulse" : lastRefresh ? "bg-green-500" : "bg-gray-300",
                )}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">
              {isRefreshing ? "Actualizando datos..." : `Última actualización: ${formattedTime}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  if (variant === "minimal") {
    return (
      <div className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm">
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Actualizando</span>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-sm transition-colors",
              isRefreshing ? "text-blue-600 bg-blue-50" : "text-gray-500 bg-gray-50",
              className,
            )}
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Actualizando..." : "Actualizado"}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Última actualización: {formattedTime}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
