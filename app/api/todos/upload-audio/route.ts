import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg'];

function getUserId(): string | null {
  const authToken = cookies().get('auth_token')?.value;
  return authToken || null;
}

async function parseFormData(request: NextRequest): Promise<{ audio: Blob; text?: string; duration?: string }> {
  const formData = await request.formData();
  const audio = formData.get('audio') as Blob | null;
  if (!audio) {
    throw new Error('No audio provided');
  }
  const text = formData.get('text') as string | null;
  const duration = formData.get('duration') as string | null;
  return { audio, text: text ?? undefined, duration: duration ?? undefined };
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { audio, text, duration } = await parseFormData(request);

    if (!ALLOWED_TYPES.includes(audio.type)) {
      return NextResponse.json(
        { error: 'Поддерживаются только форматы WebM, OGG, WAV, MP3' },
        { status: 400 }
      );
    }

    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой (макс. 10MB)' },
        { status: 400 }
      );
    }

    if (!text && audio.size === 0) {
      return NextResponse.json(
        { error: 'Добавьте текст или аудио' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());
    const audioDuration = duration ? parseFloat(duration) : 0;

    const todo = await prisma.todo.create({
      data: {
        text: text ?? null,
        userId,
        audio: {
          create: {
            data: buffer,
            mimeType: audio.type,
            size: audio.size,
            duration: audioDuration,
          },
        },
      },
      include: {
        audio: true,
        image: {
          select: {
            id: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        audio: {
          select: {
            id: true,
            mimeType: true,
            size: true,
            duration: true,
          },
        },
        image: {
          select: {
            id: true,
            mimeType: true,
            size: true,
          },
        },
      },
    });

    const serializedTodos = todos.map((t) => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
      userId: t.userId,
      createdAt: t.createdAt.toISOString(),
      hasImage: !!t.image,
      hasAudio: !!t.audio,
      audioDuration: t.audio?.duration,
    }));

    return NextResponse.json(serializedTodos);
  } catch (err) {
    console.error('Audio upload error:', err);
    return NextResponse.json(
      { error: 'Ошибка загрузки аудио' },
      { status: 500 }
    );
  }
}
