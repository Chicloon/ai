import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function getUserId(): string | null {
  const authToken = cookies().get('auth_token')?.value;
  return authToken || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const todoId = params.id;

  const todo = await prisma.todo.findUnique({
    where: { id: todoId },
    include: { audio: true },
  });

  if (!todo || todo.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!todo.audio) {
    return NextResponse.json({ error: 'No audio' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(todo.audio.data as Buffer), {
    headers: {
      'Content-Type': todo.audio.mimeType,
      'Content-Length': String(todo.audio.size),
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
