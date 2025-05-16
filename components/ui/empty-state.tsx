"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description: string
  icon?: ReactNode
  createNewText?: string
  createNewHref?: string
  onClick?: () => void
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  createNewText,
  createNewHref,
  onClick,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center",
        className,
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {createNewText && (onClick || createNewHref) && (
        <Button
          onClick={onClick}
          className="mt-4 gap-1 bg-emerald-600 hover:bg-emerald-700"
          asChild={!!createNewHref && !onClick}
        >
          {createNewHref && !onClick ? <a href={createNewHref}>{createNewText}</a> : createNewText}
        </Button>
      )}
    </div>
  )
}
