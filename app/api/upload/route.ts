import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import sharp from 'sharp';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
  }

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  // Compress image if jpg/png
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    try {
      buffer = Buffer.from(
        await sharp(buffer)
          .resize({ width: 1280, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer()
      );
    } catch (err) {
      return NextResponse.json({ error: 'Error al comprimir imagen', details: err }, { status: 500 });
    }
  }

  // Upload to Cloudinary
  try {
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: file.type === 'application/pdf' ? 'raw' : 'image',
          folder: 'evidencias',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });
    return NextResponse.json({ url: (uploadResult as any).secure_url });
  } catch (err) {
    return NextResponse.json({ error: 'Error al subir archivo', details: err }, { status: 500 });
  }
}
