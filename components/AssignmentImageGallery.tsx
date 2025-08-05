"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { CloudinaryUpload } from "./CloudinaryUpload"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ImageIcon, Download, Eye, Calendar, User, X, RefreshCw } from 'lucide-react'
import axios from "axios"
import { useToast } from "@/hooks/use-toast"

export interface AssignmentImage {
  id: number
  assignmentId: number
  dispatchId?: number
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
  type?: string
  className?: string
  thumbnail?: boolean
  size?: number
  onCount?: (count: number) => void
  onList?: (images: AssignmentImage[]) => void
  showUpload?: boolean
  title?: string
}

export function AssignmentImageGallery({ 
  assignmentId, 
  dispatchId, 
  type, 
  className, 
  thumbnail = false, 
  size = 32, 
  onCount, 
  onList,
  showUpload = true,
  title
}: AssignmentImageGalleryProps) {
  const [images, setImages] = useState<AssignmentImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<AssignmentImage | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchImages()
  }, [assignmentId, dispatchId, type])

  useEffect(() => {
    if (onCount) onCount(images.length)
    if (onList) onList(images)
  }, [images, onCount, onList])

  const fetchImages = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true)
      setError(null)

      let url = `/api/assignments/upload-images?assignmentId=${assignmentId}`
      if (dispatchId) url += `&dispatchId=${dispatchId}`
      if (type) url += `&type=${type}`

      const response = await axios.get(url)
      
      // Procesar las imágenes para asegurar URLs correctas
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dju8gpddp'
      const processedImages = response.data.images.map((image: AssignmentImage) => ({
        ...image,
        url: image.url?.startsWith('http') 
          ? image.url 
          : `https://res.cloudinary.com/${cloudName}/image/upload/${image.url}`
      }))
      
      setImages(processedImages)
    } catch (error: any) {
      console.error("Error fetching images:", error)
      setError("Error al cargar las imágenes")
      toast({
        title: "Error",
        description: "No se pudieron cargar las imágenes",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchImages(false)
  }

  const handleUploadSuccess = () => {
    fetchImages(false)
    toast({
      title: "✅ Éxito",
      description: "Las imágenes se han actualizado",
      className: "border-green-200 bg-green-50"
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'loading': '🚛 Carga',
      'unloading': '📦 Descarga',
      'delivery': '🎯 Entrega',
      'evidence': '📸 Evidencia'
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'loading': 'bg-blue-100 text-blue-700',
      'unloading': 'bg-green-100 text-green-700',
      'delivery': 'bg-orange-100 text-orange-700',
      'evidence': 'bg-purple-100 text-purple-700'
    }
    return colors[type] || 'bg-gray-100 text-gray-700'
  }

  // Modo thumbnail - solo mostrar el primer thumbnail
  if (thumbnail) {
    if (loading) {
      return (
        <div 
          className="inline-block bg-gray-200 rounded animate-pulse mr-2" 
          style={{width: size, height: size}} 
        />
      )
    }
    
    if (images.length === 0) {
      return (
        <div 
          className="flex items-center justify-center bg-gray-100 rounded mr-2 border" 
          style={{width: size, height: size, minWidth: size, minHeight: size}}
        >
          <ImageIcon className="h-3 w-3 text-gray-400" />
        </div>
      )
    }

    return (
      <div 
        className="inline-block rounded overflow-hidden mr-2 border border-gray-300 cursor-pointer hover:shadow-md transition-shadow"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        onClick={() => setSelectedImage(images[0])}
      >
        <img
          src={images[0].url || "/placeholder.svg"}
          alt={images[0].originalName || "Evidencia"}
          width={size}
          height={size}
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
          onError={(e) => {
            console.error(`Error loading image: ${images[0].url}`)
            const target = e.target as HTMLImageElement
            target.src = '/placeholder.svg?height=64&width=64&text=Error'
          }}
        />
        {images.length > 1 && (
          <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {images.length}
          </div>
        )}
      </div>
    )
  }

  // Vista completa de la galería
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title || "Cargando imágenes..."}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-600">Cargando evidencias...</span>
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
            {title || "Error al cargar imágenes"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              {title || `${getTypeLabel(type || 'evidence')} (${images.length})`}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRefresh}
                variant="ghost"
                size="sm"
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Section */}
          {showUpload && (
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4">
              <CloudinaryUpload
                context={{
                  assignmentId: String(assignmentId),
                  type: type || 'evidence',
                  dispatchId: dispatchId ? String(dispatchId) : undefined
                }}
                onUpload={handleUploadSuccess}
                label="📸 Subir Evidencia"
              />
            </div>
          )}

          {/* Images Grid */}
          {images.length === 0 ? (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {showUpload 
                  ? "No hay evidencias. Usa el botón de arriba para subir fotos." 
                  : "No hay evidencias disponibles."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div 
                  key={image.id} 
                  className="group relative border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={image.url || "/placeholder.svg"}
                      alt={image.originalName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder.svg?height=200&width=200&text=Error'
                      }}
                    />
                    
                    {/* Overlay con acciones */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedImage(image)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(image.url, "_blank")
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge className={getTypeColor(image.type)} variant="secondary">
                        {getTypeLabel(image.type)}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(image.fileSize)}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-900 truncate" title={image.originalName}>
                      {image.originalName}
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de vista previa */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          {selectedImage && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <Badge className={getTypeColor(selectedImage.type)}>
                      {getTypeLabel(selectedImage.type)}
                    </Badge>
                    {selectedImage.originalName}
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Imagen */}
                <div className="flex justify-center">
                  <img
                    src={selectedImage.url || "/placeholder.svg"}
                    alt={selectedImage.originalName}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = '/placeholder.svg?height=400&width=400&text=Error+al+cargar'
                    }}
                  />
                </div>
                
                {/* Información */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Tipo:</strong> {getTypeLabel(selectedImage.type)}</p>
                    <p><strong>Tamaño:</strong> {formatFileSize(selectedImage.fileSize)}</p>
                    <p><strong>Formato:</strong> {selectedImage.mimeType}</p>
                  </div>
                  <div>
                    <p><strong>Subido:</strong> {new Date(selectedImage.createdAt).toLocaleString()}</p>
                    {selectedImage.uploadedByUser && (
                      <p><strong>Por:</strong> {selectedImage.uploadedByUser.name} {selectedImage.uploadedByUser.lastname}</p>
                    )}
                    <p><strong>ID:</strong> {selectedImage.id}</p>
                  </div>
                </div>
                
                {/* Acciones */}
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => window.open(selectedImage.url, "_blank")}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}