import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

function getUserId(): string | null {
  const authToken = cookies().get('auth_token')?.value;
  return authToken || null;
}

function parseFormData(request: NextRequest): Promise<{ image: Blob; text?: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      const formData = await request.formData();
      const image = formData.get('image') as Blob | null;
      const text = formData.get('text') as string | null;

      if (!image) {
        reject(new Error('No image provided'));
        return;
      }

      resolve({ image, text: text || undefined });
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { image, text } = await parseFormData(request);

    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: 'Поддерживаются только JPEG и PNG' },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой (макс. 10MB)' },
        { status: 400 }
      );
    }

    if (!text && image.size === 0) {
      return NextResponse.json(
        { error: 'Добавьте текст или картинку' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    const todo = await prisma.todo.create({
      data: {
        text: text || null,
        userId,
        image: {
          create: {
            data: buffer,
            mimeType: image.type,
            size: image.size,
          },
        },
      },
      include: {
        image: true,
      },
    });

    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
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
      ...t,
      createdAt: t.createdAt.toISOString(),
      hasImage: !!t.image,
      text: t.text,
    }));

    return NextResponse.json(serializedTodos);
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Ошибка загрузки изображения' },
      { status: 500 }
    );
  }
}
