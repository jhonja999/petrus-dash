import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyToken } from "@/lib/jwt"
import { cookies } from "next/headers"

import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const token = (await cookies()).get("token")?.value;
    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const payload = await verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    const formData = await request.formData();
    const assignmentId = formData.get("assignmentId") as string;
    const type = formData.get("type") as string;
    const dispatchId = formData.get("dispatchId") as string | null;
    const images = formData.getAll("images") as File[];
    const cloudinaryUrls = formData.getAll("cloudinaryUrls") as string[];
    if (!assignmentId || !type || (!images.length && !cloudinaryUrls.length)) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    if (!["loading", "unloading"].includes(type)) return NextResponse.json({ error: "Tipo de imagen inválido" }, { status: 400 });
    const assignment = await prisma.assignment.findUnique({ where: { id: Number(assignmentId) }, include: { driver: true } });
    if (!assignment) return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
    if (payload.role !== "Admin" && payload.role !== "S_A" && assignment.driverId !== payload.id) return NextResponse.json({ error: "No tienes permisos para esta asignación" }, { status: 403 });
    const uploadedImages: any[] = [];
    // Guardar imágenes locales
    for (const image of images) {
      if (!image.type.startsWith("image/")) continue;
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadDir = join(process.cwd(), "public", "uploads", "assignments", assignmentId, type);
      if (!existsSync(uploadDir)) await mkdir(uploadDir, { recursive: true });
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const extension = image.name.split('.').pop() || 'jpg';
      const filename = `${type}_${timestamp}_${randomId}.${extension}`;
      const filepath = join(uploadDir, filename);
      await writeFile(filepath, buffer);
      const imageRecord = await prisma.assignmentImage.create({
        data: {
          assignmentId: Number(assignmentId),
          type: type as 'loading' | 'unloading',
          filename,
          originalName: image.name,
          fileSize: image.size,
          mimeType: image.type,
          uploadedBy: payload.id,
          ...(dispatchId ? { dispatchId: Number(dispatchId) } : {}),
        }
      });
      uploadedImages.push({
        id: imageRecord.id,
        filename,
        url: `/uploads/assignments/${assignmentId}/${type}/${filename}`,
        originalName: image.name,
        uploadedAt: imageRecord.createdAt
      });
    }
    // Guardar imágenes Cloudinary
    for (const url of cloudinaryUrls) {
      if (!url) continue;
      const imageRecord = await prisma.assignmentImage.create({
        data: {
          assignmentId: Number(assignmentId),
          type: type as 'loading' | 'unloading',
          filename: url.split('/').pop() || url,
          originalName: url.split('/').pop() || url,
          fileSize: 0,
          mimeType: 'image/cloudinary',
          uploadedBy: payload.id,
          ...(dispatchId ? { dispatchId: Number(dispatchId) } : {}),
        }
      });
      uploadedImages.push({
        id: imageRecord.id,
        filename: url.split('/').pop() || url,
        url,
        originalName: url.split('/').pop() || url,
        uploadedAt: imageRecord.createdAt
      });
    }
    return NextResponse.json({ success: true, message: `${uploadedImages.length} imagen(es) subida(s) correctamente`, images: uploadedImages });
  } catch (error) {
    console.error("❌ Error uploading images:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = Number(searchParams.get('assignmentId'));
    const type = searchParams.get('type') || undefined;
    const dispatchId = searchParams.get('dispatchId');
    if (!assignmentId) return NextResponse.json({ error: 'assignmentId requerido' }, { status: 400 });
    const where: any = { assignmentId: Number(assignmentId) };
    if (type && ["loading", "unloading"].includes(type)) where.type = type;
    if (dispatchId) where.dispatchId = Number(dispatchId);
    const images = await prisma.assignmentImage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        uploadedByUser: {
          select: { id: true, name: true, lastname: true }
        }
      }
    });
    const imagesWithUrls = images.map((img: any) => ({
      ...img,
      url:
        img.url && img.url.startsWith('http')
          ? img.url
          : `/uploads/assignments/${assignmentId}/${img.type}/${img.filename}`
    }));
    return NextResponse.json({ success: true, images: imagesWithUrls });
  } catch (error) {
    console.error("❌ Error fetching images:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}