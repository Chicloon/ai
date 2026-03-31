# Todo Image Upload — Design Spec

## Overview

Добавить возможность загрузки картинок как элемента todo-листа. Каждый todo может иметь текст, картинку, или оба. Минимум одно из двух обязательно.

## Requirements

- Форматы: JPEG, PNG
- Максимальный размер файла: 10MB
- Одна картинка на todo
- Хранение: PostgreSQL BYTEA через Prisma Bytes
- Загрузка: кнопка выбора файла + drag & drop
- Картинка опциональна, текст опционален, но минимум один из них

## Architecture

### Database Schema

```prisma
model Todo {
  id        String   @id @default(cuid())
  text      String?  // Опциональный текст
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

### API Endpoints

#### `POST /api/todos/upload` — Загрузка картинки

- Content-Type: `multipart/form-data`
- Поля: `image` (файл), `text` (опционально)
- Валидация: формат (jpeg/png), размер (≤10MB)
- Логика: создаёт TodoImage + Todo (с опциональным текстом)
- Возвращает обновлённый список todos

#### `GET /api/todos/:id/image` — Получение картинки

- Возвращает изображение с правильным `Content-Type`
- Требует авторизации
- Проверяет что картинка принадлежит пользователю

#### Обновлённый `POST /api/todos`

- `action: 'add'` принимает опциональный `text`
- Валидация: минимум `text` или `image` (через upload endpoint)

### Frontend Changes

#### `TodoList.tsx`

**Upload Area:**
- Кнопка «Загрузить картинку» + зона drag & drop
- Превью перед отправкой
- Отправка через `FormData` на `/api/todos/upload`

**Todo Item Rendering:**
- Если есть картинка — `<img src="/api/todos/:id/image">`
- Если есть текст — `<span>{todo.text}</span>`
- Если оба — картинка + текст
- Checkbox и delete кнопка как раньше

#### `types/todo.ts`

```typescript
export interface Todo {
  id: string;
  text: string | null;
  completed: boolean;
  userId: string;
  createdAt: Date | string;
  hasImage: boolean;
}
```

## Error Handling

- Файл > 10MB → ошибка «Файл слишком большой (макс. 10MB)»
- Неподдерживаемый формат → ошибка «Поддерживаются только JPEG и PNG»
- Нет текста и картинки → ошибка «Добавьте текст или картинку»
- Ошибка загрузки → общее сообщение об ошибке

## Testing

- Валидация размера файла
- Валидация формата файла
- Создание todo только с картинкой
- Создание todo с текстом и картинкой
- Получение картинки через GET endpoint
- Каскадное удаление todo + image
- Drag & drop функциональность
