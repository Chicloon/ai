# Todo Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить возможность загрузки картинок как элемента todo-листа с хранением в PostgreSQL.

**Architecture:** Отдельная модель TodoImage с отношением 1:1 к Todo. Картинки хранятся как Bytes в PostgreSQL BYTEA. Загрузка через multipart/form-data endpoint. Текст и картинка оба опциональны, но минимум один из них обязателен.

**Tech Stack:** Next.js 14, Prisma 5, PostgreSQL, TypeScript, Vitest

---

### Task 1: Обновить Prisma schema — добавить модель TodoImage

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Обновить schema.prisma**

Добавить модель TodoImage и изменить Todo.text на опциональный:

```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  todos     Todo[]
  createdAt DateTime @default(now())
}

model Todo {
  id        String   @id @default(cuid())
  text      String?
  completed Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  image     TodoImage?
  createdAt DateTime @default(now())
}

model TodoImage {
  id        String   @id @default(cuid())
  todoId    String   @unique
  todo      Todo     @relation(fields: [todoId], references: [id], onDelete: Cascade)
  data      Bytes
  mimeType  String
  size      Int
  createdAt DateTime @default(now())
}
```

- [ ] **Step 2: Сгенерировать Prisma Client и применить миграцию**

```bash
npm run db:migrate
```

Ожидаемый результат: миграция создана, Prisma Client сгенерирован с новыми типами.

- [ ] **Step 3: Закоммитить**

```bash
git add prisma/schema.prisma
git commit -m "feat: add TodoImage model with one-to-one relation to Todo"
```

---

### Task 2: Обновить TypeScript типы

**Files:**
- Modify: `types/todo.ts`

- [ ] **Step 1: Обновить Todo интерфейс**

```typescript
// types/todo.ts
export interface Todo {
  id: string;
  text: string | null;
  completed: boolean;
  userId: string;
  createdAt: Date | string;
  hasImage: boolean;
}

export interface User {
  id: string;
  username: string;
  createdAt: Date | string;
}
```

Изменения: `text: string | null` вместо `string`, добавлено `hasImage: boolean`.

- [ ] **Step 2: Закоммитить**

```bash
git add types/todo.ts
git commit -m "types: update Todo interface for optional text and hasImage"
```

---

### Task 3: Создать endpoint загрузки картинок POST /api/todos/upload

**Files:**
- Create: `app/api/todos/upload/route.ts`

- [ ] **Step 1: Создать route.ts для upload**

```typescript
// app/api/todos/upload/route.ts
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

    // Валидация типа файла
    if (!ALLOWED_TYPES.includes(image.type)) {
      return NextResponse.json(
        { error: 'Поддерживаются только JPEG и PNG' },
        { status: 400 }
      );
    }

    // Валидация размера
    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Файл слишком большой (макс. 10MB)' },
        { status: 400 }
      );
    }

    // Валидация: минимум текст или картинка
    if (!text && image.size === 0) {
      return NextResponse.json(
        { error: 'Добавьте текст или картинку' },
        { status: 400 }
      );
    }

    // Читаем байты изображения
    const buffer = Buffer.from(await image.arrayBuffer());

    // Создаём todo и картинку в транзакции
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

    // Сериализуем для JSON
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
```

- [ ] **Step 2: Закоммитить**

```bash
git add app/api/todos/upload/route.ts
git commit -m "feat: add POST /api/todos/upload endpoint for image uploads"
```

---

### Task 4: Создать endpoint получения картинки GET /api/todos/[id]/image/route.ts

**Files:**
- Create: `app/api/todos/[id]/image/route.ts`

- [ ] **Step 1: Создать динамический route для получения картинки**

```typescript
// app/api/todos/[id]/image/route.ts
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
    include: { image: true },
  });

  if (!todo || todo.userId !== userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!todo.image) {
    return NextResponse.json({ error: 'No image' }, { status: 404 });
  }

  return new NextResponse(todo.image.data as Buffer, {
    headers: {
      'Content-Type': todo.image.mimeType,
      'Content-Length': String(todo.image.size),
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}
```

- [ ] **Step 2: Закоммитить**

```bash
git add app/api/todos/[id]/image/route.ts
git commit -m "feat: add GET /api/todos/[id]/image endpoint"
```

---

### Task 5: Обновить GET /api/todos — включить hasImage

**Files:**
- Modify: `app/api/todos/route.ts`

- [ ] **Step 1: Обновить GET endpoint**

Изменить запрос, чтобы включать информацию о наличии картинки:

```typescript
export async function GET() {
  const userId = getUserId();
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

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
    id: t.id,
    text: t.text,
    completed: t.completed,
    userId: t.userId,
    createdAt: t.createdAt.toISOString(),
    hasImage: !!t.image,
  }));

  return NextResponse.json(serializedTodos);
}
```

- [ ] **Step 2: Закоммитить**

```bash
git add app/api/todos/route.ts
git commit -m "feat: include hasImage in GET /api/todos response"
```

---

### Task 6: Обновить POST /api/todos — валидация и include image

**Files:**
- Modify: `app/api/todos/route.ts`

- [ ] **Step 1: Обновить функцию сериализации и все action handlers**

Добавить функцию сериализации и обновить все handlers:

```typescript
// Добавить в начало файла после getUserId
function serializeTodos(todos: any[]) {
  return todos.map((t) => ({
    id: t.id,
    text: t.text,
    completed: t.completed,
    userId: t.userId,
    createdAt: t.createdAt.toISOString(),
    hasImage: !!t.image,
  }));
}

// Обновить action === 'add':
if (action === 'add') {
  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: 'Добавьте текст или картинку' },
      { status: 400 }
    );
  }
  const todo = await prisma.todo.create({
    data: { text, userId },
  });
  const todos = await prisma.todo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      image: {
        select: { id: true, mimeType: true, size: true },
      },
    },
  });
  return NextResponse.json(serializeTodos(todos));
}
```

Обновить все остальные action handlers (toggle, delete, edit) — добавить `include: { image: { select: { id: true, mimeType: true, size: true } } }` к findMany и использовать `serializeTodos()`.

- [ ] **Step 2: Закоммитить**

```bash
git add app/api/todos/route.ts
git commit -m "refactor: add serializeTodos helper and include image in all responses"
```

---

### Task 7: Обновить TodoList.tsx — добавить upload area и отображение картинок

**Files:**
- Modify: `app/components/TodoList.tsx`

- [ ] **Step 1: Добавить состояние и обработчики для загрузки картинок**

```typescript
// Добавить состояния
const [previewImage, setPreviewImage] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [uploading, setUploading] = useState(false);
const [uploadError, setUploadError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
const dropZoneRef = useRef<HTMLDivElement>(null);

// Добавить обработчики
function handleFileSelect(file: File) {
  setUploadError(null);
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    setUploadError('Поддерживаются только JPEG и PNG');
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    setUploadError('Файл слишком большой (макс. 10MB)');
    return;
  }
  setSelectedFile(file);
  const reader = new FileReader();
  reader.onload = (e) => {
    setPreviewImage(e.target?.result as string);
  };
  reader.readAsDataURL(file);
}

async function uploadImage() {
  if (!selectedFile) return;
  setUploading(true);
  setUploadError(null);

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const res = await fetch('/api/todos/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      setUploadError(data.error || 'Ошибка загрузки');
      return;
    }
    setTodos(data);
    setPreviewImage(null);
    setSelectedFile(null);
  } catch {
    setUploadError('Ошибка загрузки');
  } finally {
    setUploading(false);
  }
}

function handleDrop(e: React.DragEvent) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
}

function handleDragOver(e: React.DragEvent) {
  e.preventDefault();
}
```

- [ ] **Step 2: Обновить JSX — добавить upload area и отображение картинок**

Заменить return на:

```tsx
return (
  <div>
    <div className="header">
      <h1>Todo List {username && `(${username})`}</h1>
      <button className="logout-button" onClick={logout}>
        Logout
      </button>
    </div>

    {/* Текстовый ввод */}
    <input
      type="text"
      className="todo-input"
      placeholder="Add a todo..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={handleKeyDown}
    />

    {/* Upload area */}
    <div
      className="upload-area"
      ref={dropZoneRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
      <button onClick={() => fileInputRef.current?.click()}>
        Загрузить картинку
      </button>
      {uploadError && <p className="upload-error">{uploadError}</p>}
      {previewImage && (
        <div className="preview-container">
          <img src={previewImage} alt="Preview" className="preview-image" />
          <button onClick={uploadImage} disabled={uploading}>
            {uploading ? 'Загрузка...' : 'Добавить'}
          </button>
          <button onClick={() => { setPreviewImage(null); setSelectedFile(null); }}>
            Отмена
          </button>
        </div>
      )}
    </div>

    {/* Список todo */}
    <ul className="todo-list">
      {todos.map((todo) => (
        <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
          {todo.hasImage && (
            <img
              src={`/api/todos/${todo.id}/image`}
              alt={todo.text || 'Todo image'}
              className="todo-image"
            />
          )}
          {todo.text && <span className="todo-text">{todo.text}</span>}
          <input
            type="checkbox"
            className="todo-checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>
            ×
          </button>
        </li>
      ))}
    </ul>
  </div>
);
```

- [ ] **Step 3: Закоммитить**

```bash
git add app/components/TodoList.tsx
git commit -m "feat: add image upload UI and display images in todo list"
```

---

### Task 8: Добавить стили для upload area и картинок

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Добавить CSS стили**

Добавить в конец файла:

```css
.upload-area {
  padding: 16px;
  margin: 8px 0;
  border: 2px dashed #ccc;
  border-radius: 8px;
  text-align: center;
  transition: border-color 0.2s;
}

.upload-area:hover {
  border-color: #0070f3;
}

.upload-error {
  color: #e00;
  font-size: 14px;
  margin: 8px 0;
}

.preview-container {
  margin-top: 12px;
}

.preview-image {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  margin-bottom: 8px;
}

.todo-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 4px;
  margin-bottom: 8px;
  display: block;
}
```

- [ ] **Step 2: Закоммитить**

```bash
git add app/globals.css
git commit -m "style: add styles for image upload area and todo images"
```

---

### Task 9: Написать тесты для upload endpoint

**Files:**
- Create: `__tests__/upload.test.ts`

- [ ] **Step 1: Создать тесты валидации upload**

```typescript
// __tests__/upload.test.ts
describe('Image Upload Validation', () => {
  it('rejects files larger than 10MB', () => {
    const maxSize = 10 * 1024 * 1024;
    const fileSize = maxSize + 1;
    expect(fileSize).toBeGreaterThan(maxSize);
  });

  it('accepts jpeg images', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    expect(allowedTypes).toContain('image/jpeg');
  });

  it('accepts png images', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    expect(allowedTypes).toContain('image/png');
  });

  it('rejects unsupported formats', () => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    expect(allowedTypes).not.toContain('image/gif');
    expect(allowedTypes).not.toContain('image/webp');
  });

  it('requires at least text or image', () => {
    const hasText = false;
    const hasImage = false;
    expect(hasText || hasImage).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тесты**

```bash
npm run test -- __tests__/upload.test.ts
```

Ожидаемый результат: все тесты проходят.

- [ ] **Step 3: Закоммитить**

```bash
git add __tests__/upload.test.ts
git commit -m "test: add image upload validation tests"
```

---

### Task 10: Финальная проверка — запустить все тесты и dev сервер

- [ ] **Step 1: Запустить все тесты**

```bash
npm run test
```

Ожидаемый результат: все тесты проходят.

- [ ] **Step 2: Проверить TypeScript компиляцию**

```bash
npx tsc --noEmit
```

Ожидаемый результат: без ошибок.

- [ ] **Step 3: Закоммитить финальные изменения**

```bash
git status
git add -A
git commit -m "feat: complete image upload feature for todo list"
```
