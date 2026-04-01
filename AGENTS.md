# AGENTS.md

## Project Overview

Todo List App — Next.js приложение с PostgreSQL и авторизацией по username.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 15 (Docker)
- **ORM**: Prisma 5
- **Testing**: Vitest + React Testing Library + jsdom
- **Styling**: Vanilla CSS

## Project Structure

```
app/
├── page.tsx                 # Главная страница (TodoList)
├── layout.tsx               # Root layout
├── globals.css              # Глобальные стили
├── login/page.tsx           # Страница логина
├── components/TodoList.tsx  # Клиентский компонент списка задач
└── api/
    ├── auth/route.ts        # POST — логин, GET — проверка авторизации
    ├── auth/logout/route.ts # POST — выход (удаление cookie)
    └── todos/
        ├── route.ts         # GET — список, POST — CRUD (add/toggle/delete/edit)
        ├── upload/route.ts  # POST — загрузка картинки + создание todo
        ├── upload-audio/route.ts # POST — загрузка/запись аудио + создание todo
        └── [id]/
            ├── image/route.ts # GET — отдача бинарного изображения
            └── audio/route.ts # GET — отдача бинарного аудиофайла
lib/
└── prisma.ts                # Prisma client singleton
prisma/
└── schema.prisma            # User + Todo + TodoImage + TodoAudio модели
types/
└── todo.ts                  # TypeScript интерфейсы Todo и User
__tests__/
└── auth.test.ts             # Заглушка для тестов
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Запуск dev сервера |
| `npm run build` | Продакшен сборка |
| `npm run start` | Запуск продакшен сервера |
| `npm run test` | Запуск тестов (vitest) |
| `npm run db:generate` | Генерация Prisma Client |
| `npm run db:push` | Push schema в БД |
| `npm run db:migrate` | Prisma migration dev |

## Key Conventions

### API Routes

- Все API route'ы требуют `auth_token` cookie (кроме POST /api/auth)
- CRUD операции через единый POST endpoint `/api/todos` с полем `action` в body
- Возможные action: `add`, `toggle`, `delete`, `edit`
- Авторизация проверяется через `getUserId()` — чтение cookie `auth_token`
- **Загрузка изображений**: POST `/api/todos/upload` (FormData: `image`, опционально `text`)
- **Загрузка аудио**: POST `/api/todos/upload-audio` (FormData: `audio`, опционально `text`, `duration`)
- **Отдача изображений**: GET `/api/todos/[id]/image` (binary response)
- **Отдача аудио**: GET `/api/todos/[id]/audio` (binary response)

### Auth

- Простая авторизация по username (без пароля)
- Cookie `auth_token` хранит `user.id`, httponly, 30 дней
- При отсутствии авторизации — редирект на `/login`
- Владелец todo проверяется через `todo.userId === userId` перед мутациями

### Database

- PostgreSQL на порту 5433 (docker-compose)
- Модели: `User` (id, username unique, todos, createdAt), `Todo` (id, text, completed, userId, image?, audio?, createdAt, cascade delete), `TodoImage` (id, todoId unique, data, mimeType, size, createdAt), `TodoAudio` (id, todoId unique, data, mimeType, size, duration, createdAt)
- Prisma Client singleton через `globalThis` для предотвращения множественных подключений

### Testing

- Vitest с окружением jsdom
- Setup file: `vitest.setup.ts` (подключает @testing-library/jest-dom)
- Глобальные переменные включены (`globals: true`)
- Тестовые файлы в `__tests__/`

## Important Notes

- `.env` содержит `DATABASE_URL` и `AUTH_SECRET` — не коммитить
- `docker-compose up -d` для запуска PostgreSQL перед работой с БД
- Path alias `@/*` маппится на корень проекта
- JSX preserve для Next.js совместимости
