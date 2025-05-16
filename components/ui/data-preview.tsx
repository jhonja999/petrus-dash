import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DataPreviewProps {
  title: string
  description?: string
  data: Record<string, any>
  excludeFields?: string[]
  formatters?: Record<string, (value: any) => React.ReactNode>
}

export function DataPreview({ title, description, data, excludeFields = [], formatters = {} }: DataPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(data)
            .filter(([key]) => !excludeFields.includes(key))
            .map(([key, value]) => (
              <div key={key} className="grid grid-cols-3 items-center gap-4">
                <div className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</div>
                <div className="col-span-2">
                  {formatters[key] ? (
                    formatters[key](value)
                  ) : value === "" || value === null || value === undefined ? (
                    <span className="text-muted-foreground italic">No especificado</span>
                  ) : typeof value === "boolean" ? (
                    value ? (
                      <Badge variant="default">Sí</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )
                  ) : (
                    String(value)
                  )}
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  )
}
