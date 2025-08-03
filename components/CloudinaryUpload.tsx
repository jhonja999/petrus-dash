"use client"

import { useState } from "react"
import axios from "axios"
import { CldUploadButton } from "next-cloudinary"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CloudinaryUploadProps {
  onUpload?: () => void
  context: {
    assignmentId: string
    type: string
  }
  className?: string
  label?: string
}

export function CloudinaryUpload({
  onUpload,
  context,
  className = "",
  label = "Subir Archivos",
}: CloudinaryUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleUpload = async (result: any) => {
    console.log("Upload result:", result)
    
    if (result.event !== "success") {
      if (result.event === "error") {
        console.error("Cloudinary upload error:", result.info)
        setUploadError(`Error de upload: ${result.info?.error?.message || 'Error desconocido'}`)
        toast({
          variant: "destructive",
          title: "Error en Cloudinary",
          description: result.info?.error?.message || "Error al subir archivo"
        })
      }
      return
    }
    
    setIsUploading(true)
    setUploadError(null)
    
    try {
      if (result?.info) {
        console.log("Saving image info:", result.info)
        
        // Save the image info to your backend
        await axios.post('/api/assignments/upload-images', {
          assignmentId: context.assignmentId,
          type: context.type,
          filename: result.info.public_id,
          originalName: result.info.original_filename,
          fileSize: result.info.bytes,
          mimeType: result.info.format,
          url: result.info.secure_url,
          cloudinaryData: result.info // Store full Cloudinary response
        })

        toast({
          title: "Archivo subido exitosamente",
          description: `${result.info.original_filename} se subió correctamente`
        })

        // Notify parent component to refresh images
        onUpload?.()
      }
    } catch (error) {
      console.error('Error al guardar la imagen en backend:', error)
      setUploadError("Error al guardar en base de datos")
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "No se pudo guardar la información de la imagen en la base de datos"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleError = (error: any) => {
    console.error("Upload widget error:", error)
    setUploadError(`Error del widget: ${error.message || 'Error desconocido'}`)
    toast({
      variant: "destructive",
      title: "Error de upload",
      description: "No se pudo inicializar el widget de upload"
    })
  }

  return (
    <div className="space-y-2">
      <CldUploadButton
        onUpload={handleUpload}
        onError={handleError}
        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default"}
        options={{
          maxFiles: 5,
          multiple: true,
          sources: ['local', 'camera'],
          resourceType: 'auto', // Permite imágenes y otros archivos
          clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
          maxFileSize: 10000000, // 10MB
          folder: 'dispatch-photos',
          tags: [`assignment-${context.assignmentId}`, `type-${context.type}`, 'petrus-dispatch'],
          // Configuraciones adicionales para mejor UX
          showPoweredBy: false,
          theme: 'minimal',
          styles: {
            palette: {
              window: "#FFFFFF",
              windowBorder: "#90A0B3",
              tabIcon: "#0078FF",
              menuIcons: "#5A616A",
              textDark: "#000000",
              textLight: "#FFFFFF",
              link: "#0078FF",
              action: "#FF620C",
              inactiveTabIcon: "#C4C4C4",
              error: "#F44235",
              inProgress: "#0078FF",
              complete: "#20B832",
              sourceBg: "#E4EBF1"
            }
          }
        }}
      >
        <div 
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-800 dark:hover:text-slate-50 h-10 px-4 py-2 ${className} ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4 animate-spin" />
              Guardando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {label}
            </span>
          )}
        </div>
      </CldUploadButton>
      
      {uploadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {uploadError}
        </div>
      )}
    </div>
  )
}