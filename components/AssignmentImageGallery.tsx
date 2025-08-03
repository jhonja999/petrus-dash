"use client"

import React, { useEffect, useState } from "react"
import { CloudinaryUpload } from "./CloudinaryUpload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ImageIcon, Download, Eye, Calendar, User } from "lucide-react"
import axios from "axios"

interface AssignmentImage {
  id: number
  assignmentId: number
  type: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  uploadedBy: number
  createdAt: string
  url: string
  uploadedByUser?: {
    id: number
    name: string
    lastname: string
  }
}

interface AssignmentImageGalleryProps {
  assignmentId: number
  dispatchId?: number
  type?: string // 'carga' | 'descarga'
  className?: string
}

export function AssignmentImageGallery({ assignmentId, dispatchId, type, className }: AssignmentImageGalleryProps) {
  const [images, setImages] = useState<AssignmentImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<AssignmentImage | null>(null)

  useEffect(() => {
    fetchImages()
  }, [assignmentId, dispatchId, type])

  const fetchImages = async () => {
    try {
      setLoading(true)
      let url = `/api/assignments/upload-images?assignmentId=${assignmentId}`
      if (dispatchId) url += `&dispatchId=${dispatchId}`
      if (type) url += `&type=${type}`
      const response = await axios.get(url)
      setImages(response.data.images)
    } catch (error) {
      console.error("Error fetching images:", error)
      setError("Error al cargar las imágenes")
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTypeLabel = (type: string) => {
    return type === "loading" ? "Carga" : "Descarga"
  }

  const getTypeColor = (type: string) => {
    return type === "loading" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Documentación de Imágenes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando imágenes...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Documentación de Imágenes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchImages} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (images.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Documentación de Imágenes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay imágenes subidas para esta asignación</p>
            <div className="mt-4 flex justify-center">
              <CloudinaryUpload
                label="Subir evidencia"
                context={{ assignmentId: String(assignmentId), type: type || "" }}
                onUpload={fetchImages}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Documentación de Imágenes ({images.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image) => (
              <div key={image.id} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-video bg-gray-100 relative group">
                  <img
                    src={image.url}
                    alt={image.originalName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder-image.jpg"
                    }}
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedImage(image)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(image.url, "_blank")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getTypeColor(image.type)}>
                      {getTypeLabel(image.type)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatFileSize(image.fileSize)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate" title={image.originalName}>
                    {image.originalName}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                    {image.uploadedByUser && (
                      <>
                        <User className="h-3 w-3" />
                        <span>{image.uploadedByUser.name} {image.uploadedByUser.lastname}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modal para vista previa */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{selectedImage.originalName}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedImage(null)}
              >
                ×
              </Button>
            </div>
            <div className="p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.originalName}
                className="max-w-full max-h-[70vh] object-contain mx-auto"
              />
              <div className="mt-4 space-y-2 text-sm text-gray-600">
                <p><strong>Tipo:</strong> {getTypeLabel(selectedImage.type)}</p>
                <p><strong>Tamaño:</strong> {formatFileSize(selectedImage.fileSize)}</p>
                <p><strong>Subido:</strong> {new Date(selectedImage.createdAt).toLocaleString()}</p>
                {selectedImage.uploadedByUser && (
                  <p><strong>Por:</strong> {selectedImage.uploadedByUser.name} {selectedImage.uploadedByUser.lastname}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 