import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Fuel, TrendingUp } from "lucide-react"

export interface CapacityInfo {
  current: number
  maximum: number
  unit?: string
  label?: string
}

interface CapacityBarProps {
  capacity: CapacityInfo
  showDetails?: boolean
  size?: "sm" | "md" | "lg"
  orientation?: "horizontal" | "vertical"
  className?: string
}

export function CapacityBar({
  capacity,
  showDetails = true,
  size = "md",
  orientation = "horizontal",
  className,
}: CapacityBarProps) {
  const { current, maximum, unit = "gal", label = "Capacidad" } = capacity

  // Calcular porcentaje
  const percentage = maximum > 0 ? Math.min((current / maximum) * 100, 100) : 0
  const remaining = Math.max(maximum - current, 0)

  // Determinar estado y color
  const getStatus = () => {
    if (percentage >= 100) return { status: "full", color: "bg-red-500", textColor: "text-red-700" }
    if (percentage >= 90) return { status: "high", color: "bg-orange-500", textColor: "text-orange-700" }
    if (percentage >= 70) return { status: "medium", color: "bg-yellow-500", textColor: "text-yellow-700" }
    if (percentage >= 30) return { status: "low", color: "bg-blue-500", textColor: "text-blue-700" }
    return { status: "empty", color: "bg-gray-300", textColor: "text-gray-600" }
  }

  const { status, color, textColor } = getStatus()

  const getStatusText = () => {
    switch (status) {
      case "full":
        return "Lleno"
      case "high":
        return "Alto"
      case "medium":
        return "Medio"
      case "low":
        return "Bajo"
      default:
        return "Vacío"
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "full":
        return <AlertTriangle className="h-4 w-4" />
      case "high":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Fuel className="h-4 w-4" />
    }
  }

  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }

  if (orientation === "vertical") {
    return (
      <div className={cn("flex flex-col items-center space-y-2", className)}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={cn("text-sm font-medium", textColor)}>{getStatusText()}</span>
        </div>

        <div className="relative w-8 h-32 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn("absolute bottom-0 w-full transition-all duration-300", color)}
            style={{ height: `${percentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-white mix-blend-difference">{Math.round(percentage)}%</span>
          </div>
        </div>

        {showDetails && (
          <div className="text-center text-xs text-gray-600">
            <div>
              {current.toLocaleString()} / {maximum.toLocaleString()} {unit}
            </div>
            <div className="text-green-600">
              Disponible: {remaining.toLocaleString()} {unit}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showDetails && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className="text-sm font-medium">{label}</span>
            <Badge variant={status === "full" ? "destructive" : "secondary"} className={textColor}>
              {getStatusText()}
            </Badge>
          </div>
          <span className="text-sm text-gray-600">
            {Math.round(percentage)}% ({current.toLocaleString()}/{maximum.toLocaleString()} {unit})
          </span>
        </div>
      )}

      <div className="relative">
        <Progress value={percentage} className={cn("w-full", sizeClasses[size])} />
        {status === "full" && <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse opacity-20" />}
      </div>

      {showDetails && (
        <div className="flex justify-between text-xs text-gray-600">
          <span>
            Usado: {current.toLocaleString()} {unit}
          </span>
          <span className="text-green-600">
            Disponible: {remaining.toLocaleString()} {unit}
          </span>
        </div>
      )}

      {status === "full" && (
        <div className="flex items-center space-x-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />
          <span>¡Capacidad máxima alcanzada!</span>
        </div>
      )}
    </div>
  )
}
