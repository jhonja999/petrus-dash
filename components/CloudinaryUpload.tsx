"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Camera, Upload, Loader2, AlertCircle } from 'lucide-react'
import { useToast } from "@/hooks/use-toast"
import axios from "axios"

// Declarar el tipo para el widget de Cloudinary
export type CloudinaryUploadOptions = {
  cloudName: string
  uploadPreset: string
  sources: string[]
  multiple?: boolean
  maxFiles?: number
  resourceType?: string
  clientAllowedFormats?: string[]
  maxImageWidth?: number
  maxImageHeight?: number
  maxImageFileSize?: number
  folder?: string
  tags?: string[]
  context?: Record<string, string>
}

export type CloudinaryWidget = {
  open: () => void
  close: () => void
  destroy: () => void
}

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: CloudinaryUploadOptions,
        callback: (error: any, result: any) => void
      ) => CloudinaryWidget
    }
  }
}

interface CloudinaryUploadProps {
  onUpload?: (results: CloudinaryUploadResult[]) => void
  context: {
    assignmentId: string
    type: string
    dispatchId?: string
  }
  className?: string
  label?: string
  multiple?: boolean
  folder?: string
}

interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  original_filename: string
  bytes: number
  format: string
  created_at: string
}

export function CloudinaryUpload({
  onUpload,
  context,
  className = "",
  label = "Subir Evidencia",
  multiple = true,
  folder
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [widget, setWidget] = useState<CloudinaryWidget | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const { toast } = useToast()
  const widgetRef = useRef<CloudinaryWidget | null>(null)

  // Cargar el script de Cloudinary
  useEffect(() => {
    if (window.cloudinary) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://widget.cloudinary.com/v2.0/global/all.js'
    script.async = true
    script.onload = () => {
      setScriptLoaded(true)
    }
    script.onerror = () => {
      setUploadError("Error al cargar el widget de Cloudinary")
    }
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Crear el widget cuando el script esté cargado
  useEffect(() => {
    if (!scriptLoaded || !window.cloudinary) return

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dju8gpddp'
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'petrus-evidence'

    const uploadOptions: CloudinaryUploadOptions = {
      cloudName,
      uploadPreset,
      sources: ['local', 'camera', 'image_search', 'url'],
      multiple: multiple,
      maxFiles: multiple ? 10 : 1,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxImageWidth: 2000,
      maxImageHeight: 2000,
      maxImageFileSize: 10000000, // 10MB
      folder: folder || `assignments/${context.assignmentId}`,
      tags: [
        `assignment_${context.assignmentId}`,
        `type_${context.type}`,
        ...(context.dispatchId ? [`dispatch_${context.dispatchId}`] : [])
      ],
      context: {
        assignmentId: context.assignmentId,
        type: context.type,
        ...(context.dispatchId && { dispatchId: context.dispatchId })
      }
    }

    const newWidget = window.cloudinary.createUploadWidget(
      uploadOptions,
      async (error: any, result: any) => {
        if (error) {
          console.error('Cloudinary upload error:', error)
          setUploadError(`Error de Cloudinary: ${error.message || 'Error desconocido'}`)
          setIsUploading(false)
          return
        }

        if (result && result.event === "success") {
          console.log('Cloudinary upload success:', result.info)
          
          try {
            // Guardar la referencia en la base de datos
            await saveImageToDatabase(result.info)
          } catch (dbError) {
            console.error('Error saving to database:', dbError)
            setUploadError("Error al guardar en la base de datos")
          }
        }

        if (result && result.event === "close") {
          setIsUploading(false)
        }

        if (result && result.event === "display-changed") {
          if (result.info === "shown") {
            setIsUploading(true)
            setUploadError(null)
          }
        }
      }
    )

    setWidget(newWidget)
    widgetRef.current = newWidget

    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy()
      }
    }
  }, [scriptLoaded, context, multiple, folder])

  const saveImageToDatabase = async (uploadResult: CloudinaryUploadResult) => {
    try {
      const response = await axios.post('/api/assignments/save-cloudinary-image', {
        assignmentId: context.assignmentId,
        dispatchId: context.dispatchId,
        type: context.type,
        imageUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        originalName: uploadResult.original_filename || 'imagen',
        fileSize: uploadResult.bytes,
        format: uploadResult.format,
        uploadedBy: 1 // Por ahora hardcodeado, deberías obtenerlo del contexto de auth
      })

      if (response.data.success) {
        toast({
          title: "✅ Imagen subida exitosamente",
          description: `${uploadResult.original_filename} se subió correctamente`,
          className: "border-green-200 bg-green-50"
        })

        if (onUpload) {
          onUpload([uploadResult])
        }
      }
    } catch (error: any) {
      console.error('Error saving image to database:', error)
      const errorMessage = error.response?.data?.error || "Error al guardar la imagen"
      setUploadError(errorMessage)
      toast({
        title: "❌ Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  const handleOpenWidget = () => {
    if (!widget) {
      setUploadError("Widget no disponible")
      return
    }

    setUploadError(null)
    widget.open()
  }

  if (!scriptLoaded) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-sm text-gray-600">Cargando widget...</span>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        type="button"
        onClick={handleOpenWidget}
        disabled={isUploading || !widget}
        className="w-full flex items-center gap-2"
        variant="outline"
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            <Upload className="h-4 w-4" />
            {label}
          </>
        )}
      </Button>

      {uploadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        📸 Puedes tomar fotos con la cámara o subir desde archivos
      </p>
    </div>
  )
}