import { NextResponse } from 'next/server';
import { getValidatedSessionUser } from '@/server/session-validation';
import { getUploadService } from '@/server/upload/upload-service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB for voice messages

export async function POST(request: Request) {
  const user = await getValidatedSessionUser();
  if (!user) {
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
      { error: 'File too large. Maximum size is 5 MB.' },
      { status: 400 }
    );
  }
  const type = file.type?.toLowerCase();
  if (!type || !type.startsWith('audio/')) {
    return NextResponse.json(
      { error: 'Invalid file type. Use an audio file (e.g. webm, wav, mp3).' },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const name = file.name || `voice-${Date.now()}.webm`;
    const result = await uploadService.upload(buffer, name, { folder: 'converseai-voice' });
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error('[Upload] Voice upload failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
