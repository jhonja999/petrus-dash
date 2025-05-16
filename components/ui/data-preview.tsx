import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DataPreviewProps {
  title: string
  description?: string
  data: Record<string, any>
  formatters?: Record<string, (value: any) => React.ReactNode>
  excludeFields?: string[]
}

export function DataPreview({ title, description, data, formatters = {}, excludeFields = [] }: DataPreviewProps) {
  // Filter out excluded fields and empty values
  const filteredData = Object.entries(data).filter(
    ([key, value]) => !excludeFields.includes(key) && value !== undefined && value !== null && value !== "",
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {filteredData.map(([key, value]) => (
            <div key={key} className="flex flex-col space-y-1">
              <p className="text-sm font-medium text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, " $1").toLowerCase()}
              </p>
              <div className="font-medium">
                {formatters[key] ? formatters[key](value) : typeof value === "object" ? JSON.stringify(value) : value}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
