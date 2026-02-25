import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { ingestFile, ingestUrl } from '@/server/services/knowledge-ingest-service';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenant_id: session.user.tenantId },
  });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const url = formData.get('url') as string | null;

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 15 MB.' },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestFile(
      buffer,
      file.name,
      projectId,
      session.user.tenantId
    );
    return NextResponse.json(result);
  }

  if (url && url.trim()) {
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    const result = await ingestUrl(url.trim(), projectId, session.user.tenantId);
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { error: 'Provide either a file or a url in the request.' },
    { status: 400 }
  );
}
