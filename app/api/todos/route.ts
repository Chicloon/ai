import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

function getUserId(): string | null {
  const authToken = cookies().get('auth_token')?.value;
  return authToken || null;
}

export async function GET() {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const todos = await prisma.todo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { action, id, text } = body;

  if (action === 'add') {
    const todo = await prisma.todo.create({
      data: { text, userId },
    });
    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(todos);
  }

  if (action === 'toggle') {
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (todo && todo.userId === userId) {
      await prisma.todo.update({
        where: { id },
        data: { completed: !todo.completed },
      });
    }
    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(todos);
  }

  if (action === 'delete') {
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (todo && todo.userId === userId) {
      await prisma.todo.delete({ where: { id } });
    }
    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(todos);
  }

  if (action === 'edit') {
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (todo && todo.userId === userId) {
      await prisma.todo.update({
        where: { id },
        data: { text },
      });
    }
    const todos = await prisma.todo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(todos);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
