# AGENTS.md

## Project Overview

Todo List App — Next.js приложение с PostgreSQL и авторизацией по username. Интерфейс: тёмная тема на Tailwind, шрифты через `next/font`.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL 15 (Docker)
- **ORM**: Prisma 5
- **Testing**: Vitest + React Testing Library + jsdom
- **Styling**: Tailwind CSS 3 (кастомные цвета `burgundy` / `burnt` в [tailwind.config.js](tailwind.config.js))
- **Fonts**: [Inter](https://fonts.google.com/specimen/Inter) — основной текст (layout); [Marck Script](https://fonts.google.com/specimen/Marck+Script) — имя пользователя в шапке TodoList (прописной стиль)

## UI

- Тёмный фон (градиент slate), карточки с полупрозрачным фоном и рамкой.
- Страницы `/` и `/login` визуально согласованы (фокус-кольца, акцентные кнопки).
- Глобальные стили: [app/globals.css](app/globals.css) — директивы Tailwind, минимальный reset, `color-scheme: dark`.

## Project Structure

```
app/
├── page.tsx                 # Главная страница (TodoList)
├── layout.tsx               # Root layout (Inter, фон body)
├── globals.css              # Tailwind + базовый reset
├── login/page.tsx           # Страница логина
├── components/TodoList.tsx  # Список задач, загрузка изображений
└── api/
    ├── auth/route.ts        # POST — логин, GET — проверка авторизации
    ├── auth/logout/route.ts # POST — выход (удаление cookie)
    ├── todos/route.ts       # GET — список, POST — CRUD (add/toggle/delete/edit)
    ├── todos/upload/route.ts # POST — загрузка картинки (JPEG/PNG)
    └── todos/[id]/image/route.ts # GET — отдача изображения todo
lib/
└── prisma.ts                # Prisma client singleton
prisma/
└── schema.prisma            # User, Todo, TodoImage
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
- Загрузка изображений: POST `/api/todos/upload` (multipart), выдача: GET `/api/todos/[id]/image`
- Авторизация проверяется через `getUserId()` — чтение cookie `auth_token`

### Auth

- Простая авторизация по username (без пароля)
- Cookie `auth_token` хранит `user.id`, httponly, 30 дней
- При отсутствии авторизации — редирект на `/login`
- Владелец todo проверяется через `todo.userId === userId` перед мутациями

### Database

- PostgreSQL на порту 5433 (docker-compose)
- Модели: `User`, `Todo` (text опционален для задач с картинкой), `TodoImage` (bytes + mime), cascade delete
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
