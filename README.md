# Todo List App

Next.js приложение с PostgreSQL и авторизацией.

## Технологии

- Next.js 14 (App Router)
- PostgreSQL (Docker)
- Prisma ORM
- Vitest

## Запуск

```bash
# Установить зависимости
npm install

# Запустить PostgreSQL
docker-compose up -d

# Сгенерировать Prisma Client
npx prisma generate

# Создать таблицы в БД
npx prisma db push

# Запустить dev сервер
npm run dev
```

## Тесты

```bash
npm run test
```

## Сборка

```bash
npm run build
```
