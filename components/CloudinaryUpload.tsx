"use client"

import { useState } from "react"
import axios from "axios"
import { Button } from "@/components/ui/button"
import { Upload, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface CloudinaryUploadProps {
  onUpload?: () => void
  context: {
    assignmentId: string
    type: string
    dispatchId?: string
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
  console.log("[CloudinaryUpload] Renderizado, props:", { context, onUpload, className, label });
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [lastImageUrl, setLastImageUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setLastImageUrl(URL.createObjectURL(e.target.files[0]));
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("Selecciona un archivo primero");
      return;
    }
    setIsUploading(true);
    setUploadError(null);
    try {
      // 1. Subir imagen a Cloudinary
      const cloudinaryForm = new FormData();
      cloudinaryForm.append("file", selectedFile);
      cloudinaryForm.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || "petrus-evidence");
      const cloudinaryRes = await fetch("https://api.cloudinary.com/v1_1/" + (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dju8gpddp") + "/image/upload", {
        method: "POST",
        body: cloudinaryForm
      });
      const cloudinaryData = await cloudinaryRes.json();
      if (!cloudinaryData.secure_url) {
        setUploadError("Error al subir a Cloudinary: " + (cloudinaryData.error?.message || "Sin URL"));
        toast({
          variant: "destructive",
          title: "Error Cloudinary",
          description: cloudinaryData.error?.message || "No se pudo subir la imagen a Cloudinary"
        });
        setIsUploading(false);
        return;
      }
      setLastImageUrl(cloudinaryData.secure_url);
      // 2. Enviar URL a backend
      const formData = new FormData();
      formData.append("assignmentId", context.assignmentId);
      formData.append("type", context.type);
      if (context.dispatchId) formData.append("dispatchId", context.dispatchId);
      formData.append("cloudinaryUrls", cloudinaryData.secure_url);
      for (let pair of formData.entries()) {
        console.log(`[CloudinaryUpload] FormData: ${pair[0]} =`, pair[1]);
      }
      try {
        const backendResponse = await axios.post("/api/assignments/upload-images", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        toast({
          title: "Archivo subido exitosamente",
          description: `${selectedFile.name} se subió correctamente a Cloudinary y sistema`
        });
        if (onUpload) onUpload();
      } catch (error: any) {
        let errorMsg = "Error al guardar en backend";
        if (error?.response?.data) {
          errorMsg += ": " + (error.response.data.error || JSON.stringify(error.response.data));
        }
        setUploadError(errorMsg);
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: errorMsg
        });
        console.error("[CloudinaryUpload] Backend error:", error);
      }
    } finally {
      setIsUploading(false);
    }
  };
  // ...existing code above...
  return (
    <div className={className}>
      <label className="block mb-2 text-sm font-medium text-gray-700">Selecciona una imagen para subir</label>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mb-2 block w-full text-sm text-gray-600 border border-gray-300 rounded"
        disabled={isUploading}
      />
      <Button
        type="button"
        onClick={handleUpload}
        disabled={isUploading || !selectedFile}
        className="w-full flex items-center gap-2 mb-2"
      >
        <Upload className="h-4 w-4" />
        {isUploading ? "Subiendo..." : label}
      </Button>
      {/* Preview de la última imagen seleccionada */}
      {lastImageUrl && (
        <div className="mt-2">
          <span className="text-xs text-gray-500">Vista previa:</span>
          <img src={lastImageUrl} alt="Preview" style={{maxWidth:120, maxHeight:120, borderRadius:8, marginTop:4}} />
        </div>
      )}
      {uploadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4" />
          {uploadError}
        </div>
      )}
    </div>
  );
// ...existing code above...
}