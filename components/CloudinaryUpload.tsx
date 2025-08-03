"use client"

import { useState } from "react"
import { CldUploadButton, CldImage } from "next-cloudinary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Upload, Camera, FileText, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UploadedFile {
  public_id: string
  secure_url: string
  original_filename: string
  format: string
  bytes: number
  width?: number
  height?: number
  resource_type: string
  created_at: string
}

interface CloudinaryUploadProps {
  onUpload?: (files: UploadedFile[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
  folder?: string
  tags?: string[]
  context?: Record<string, string>
  className?: string
  multiple?: boolean
  required?: boolean
  label?: string
  description?: string
}

const PHOTO_TYPES = {
  loading_start: { label: "Inicio de Carga", icon: Camera, color: "bg-blue-100 text-blue-800" },
  loading_end: { label: "Término de Carga", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  delivery: { label: "Entrega", icon: Camera, color: "bg-orange-100 text-orange-800" },
  client_confirmation: { label: "Conformidad Cliente", icon: FileText, color: "bg-purple-100 text-purple-800" },
  odometer: { label: "Odómetro", icon: Camera, color: "bg-gray-100 text-gray-800" },
}

export function CloudinaryUpload({
  onUpload,
  maxFiles = 5,
  acceptedTypes = ["image/jpeg", "image/png", "application/pdf"],
  folder = "dispatch-photos",
  tags = [],
  context = {},
  className = "",
  multiple = true,
  required = false,
  label = "Subir Archivos",
  description = "JPG, PNG, PDF - Máximo 5MB por archivo",
}: CloudinaryUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  const handleUpload = (result: any, { widget }: any) => {
    if (result.event !== "success") return

    if (result?.info) {
      const newFile: UploadedFile = {
        public_id: result.info.public_id,
        secure_url: result.info.secure_url,
        original_filename: result.info.original_filename || "archivo",
        format: result.info.format,
        bytes: result.info.bytes,
        width: result.info.width,
        height: result.info.height,
        resource_type: result.info.resource_type,
        created_at: result.info.created_at,
      }

      const updatedFiles = multiple ? [...uploadedFiles, newFile].slice(0, maxFiles) : [newFile]

      setUploadedFiles(updatedFiles)
      onUpload?.(updatedFiles)

      toast({
        title: "Archivo subido",
        description: `${newFile.original_filename} se subió correctamente`,
      })
    }

    widget.close()
  }

  const removeFile = (publicId: string) => {
    const updatedFiles = uploadedFiles.filter((file) => file.public_id !== publicId)
    setUploadedFiles(updatedFiles)
    onUpload?.(updatedFiles)

    toast({
      title: "Archivo eliminado",
      description: "El archivo se eliminó correctamente",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (format: string, resourceType: string) => {
    if (resourceType === "image") return Camera
    if (format === "pdf") return FileText
    return Upload
  }

  const isDisabled = uploadedFiles.length >= maxFiles

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Button */}
      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <Badge variant="outline" className="text-xs">
            {uploadedFiles.length}/{maxFiles}
          </Badge>
        </div>

        <div className={`${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
          <CldUploadButton
            className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100"
            onUpload={handleUpload}
            uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
            options={{
              multiple,
              maxFiles: maxFiles - uploadedFiles.length,
              maxFileSize: 5000000, // 5MB
              clientAllowedFormats: acceptedTypes.map((type) => type.split("/")[1]),
              folder,
              tags: [...tags, "dispatch", "petrus"],
              context,
              sources: ["local", "camera"],
              showAdvancedOptions: false,
              cropping: false,
              resourceType: "auto",
            }}
          >
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <div className="text-sm text-gray-600">
                <span className="font-medium text-blue-600 hover:text-blue-500">Haz clic para subir</span>
                {" o arrastra archivos aquí"}
              </div>
              <p className="text-xs text-gray-500 mt-1">{description}</p>
            </div>
          </CldUploadButton>
        </div>
      </div>

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Archivos subidos:</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.format, file.resource_type)

              return (
                <Card key={file.public_id} className="relative group">
                  <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                      {/* Preview */}
                      <div className="flex-shrink-0">
                        {file.resource_type === "image" ? (
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                            <CldImage
                              src={file.public_id}
                              alt={file.original_filename}
                              width={48}
                              height={48}
                              crop="fill"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <FileIcon className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.original_filename}</p>
                        <p className="text-xs text-gray-500">
                          {file.format.toUpperCase()} • {formatFileSize(file.bytes)}
                        </p>
                        {file.width && file.height && (
                          <p className="text-xs text-gray-400">
                            {file.width} × {file.height}
                          </p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                        onClick={() => removeFile(file.public_id)}
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Photo Type Suggestions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h5 className="text-sm font-medium text-blue-900 mb-2">Fotos de despacho:</h5>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PHOTO_TYPES).map(([key, type]) => {
            const Icon = type.icon
            return (
              <Badge key={key} className={`${type.color} text-xs`}>
                <Icon className="h-3 w-3 mr-1" />
                {type.label}
              </Badge>
            )
          })}
        </div>
      </div>
    </div>
  )
}
