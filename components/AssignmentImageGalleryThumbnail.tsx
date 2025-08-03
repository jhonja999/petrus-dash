"use client"

import React, { useEffect, useState } from "react"
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
  url: string
  createdAt: string
}

interface Props {
  assignmentId: number
  type?: string
  size?: number // px
}

export function AssignmentImageGalleryThumbnail({ assignmentId, type = "unloading", size = 32 }: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchThumb = async () => {
      try {
        const url = `/api/assignments/upload-images?assignmentId=${assignmentId}&type=${type}`
        const res = await axios.get(url)
        const images = res.data.images as AssignmentImage[]
        if (images && images.length > 0) {
          setThumbUrl(images[0].url)
        } else {
          setThumbUrl(null)
        }
      } catch {
        setThumbUrl(null)
      }
    }
    fetchThumb()
  }, [assignmentId, type])

  if (!thumbUrl) {
    return <span className="inline-block w-8 h-8 bg-gray-200 rounded mr-2" style={{width: size, height: size}} />
  }
  return (
    <img
      src={thumbUrl}
      alt="Evidencia"
      className="inline-block rounded object-cover mr-2 border border-gray-300"
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    />
  )
}
