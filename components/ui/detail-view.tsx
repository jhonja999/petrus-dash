"use client"

import type React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Field {
  label: string
  value: React.ReactNode
}

interface DetailViewProps {
  title: string
  description: string
  fields: Field[]
  open: boolean
  onClose: () => void
  onEdit?: () => void
}

export function DetailView({ title, description, fields, open, onClose, onEdit }: DetailViewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-2 pr-4">
            {fields.map((field, index) => (
              <div key={index} className="grid grid-cols-3 gap-4">
                <div className="text-sm font-medium">{field.label}</div>
                <div className="col-span-2 text-sm">{field.value}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              Editar
            </Button>
          )}
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
