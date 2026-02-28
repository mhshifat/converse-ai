import { NextResponse } from 'next/server';
import { getChatbotByApiKey } from '@/server/services/conversation-service';
import { getUploadService } from '@/server/upload/upload-service';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
];

export async function POST(request: Request) {
  const formData = await request.formData();
  const apiKey = formData.get('apiKey') as string | null;
  const file = formData.get('file') as File | null;

  if (!apiKey?.trim()) {
    return NextResponse.json({ error: 'API key required' }, { status: 400 });
  }
  const chatbot = await getChatbotByApiKey(apiKey.trim());
  if (!chatbot) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 5 MB.' },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use image, PDF, or text.' },
      { status: 400 }
    );
  }

  const uploadService = getUploadService();
  if (!uploadService) {
    return NextResponse.json(
      { error: 'Upload not configured.' },
      { status: 503 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadService.upload(buffer, file.name, {
      folder: 'converseai-widget',
    });
    return NextResponse.json({ url: result.url });
  } catch (err) {
    console.error('[Widget upload] Failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
