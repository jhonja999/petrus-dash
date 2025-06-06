"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorColor?: string
  trackColor?: string
  size?: "sm" | "md" | "lg"
  showValue?: boolean
  valuePosition?: "inside" | "outside"
  animate?: boolean
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      indicatorColor,
      trackColor,
      size = "md",
      showValue = false,
      valuePosition = "outside",
      animate = true,
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    // Size variants
    const sizeClasses = {
      sm: "h-2",
      md: "h-4",
      lg: "h-6",
    }

    return (
      <div className={cn("w-full flex items-center gap-2", className)}>
        <div
          ref={ref}
          className={cn("relative w-full overflow-hidden rounded-full", trackColor || "bg-gray-100", sizeClasses[size])}
          {...props}
        >
          <div
            className={cn(
              "h-full transition-all",
              indicatorColor || "bg-blue-500",
              animate && "transition-all duration-500 ease-in-out",
            )}
            style={{ width: `${percentage}%` }}
          >
            {showValue && valuePosition === "inside" && percentage > 15 && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                {percentage.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {showValue && valuePosition === "outside" && (
          <span className="text-xs font-medium text-gray-700 min-w-[40px]">{percentage.toFixed(1)}%</span>
        )}
      </div>
    )
  },
)

Progress.displayName = "Progress"

export { Progress }
