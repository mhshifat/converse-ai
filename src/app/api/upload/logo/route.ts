import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { getUploadService } from '@/server/upload/upload-service';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB for logos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export async function POST(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const uploadService = getUploadService();
  if (!uploadService) {
    return NextResponse.json(
      { error: 'Upload not configured. Set CLOUDINARY_* env or UPLOAD_PROVIDER.' },
      { status: 503 }
    );
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 2 MB.' },
      { status: 400 }
    );
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use JPEG, PNG, GIF, WebP, or SVG.' },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadService.upload(buffer, file.name, { folder: 'converseai-logos' });
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error('[Upload] Logo upload failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
