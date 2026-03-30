# Todo List — Design

## Architecture
- **Frontend**: Next.js (App Router) + React
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL in Docker + Prisma ORM
- **Authorization**: Simple username-based (cookie)
- **Styling**: Minimal CSS

## Structure
```
app/
├── page.tsx              # Main page (redirect to /login if not authenticated)
├── login/
│   └── page.tsx          # Login page
├── layout.tsx           # Base layout
├── globals.css          # Styles
└── api/
    ├── todos/
    │   └── route.ts     # CRUD todos (authenticated)
    └── auth/
        └── route.ts    # Login/Logout
prisma/
├── schema.prisma        # Database schema
docker-compose.yml      # PostgreSQL container
.env                    # DATABASE_URL, AUTH_SECRET
middleware.ts           # Route protection
```

## Database Schema (Prisma)
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  todos     Todo[]
  createdAt DateTime @default(now())
}

model Todo {
  id        String   @id @default(cuid())
  text      String
  completed Boolean  @default(false)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

## Authorization
- On `/login` user enters username
- On login: create user in DB (if not exists) or get existing
- Set cookie `auth_token` with userId
- API checks cookie and filters todos by userId

## API Endpoints
- `POST /api/auth` — login (get/create user, set cookie)
- `GET /api/auth` — check auth status
- `POST /api/auth/logout` — logout (delete cookie)
- `GET /api/todos` — get todos for current user
- `POST /api/todos` — CRUD operations (filtered by userId from cookie)

## Functionality
- **View** — list all todos with checkboxes
- **Add** — input field + button/Enter
- **Edit** — click on todo text to edit
- **Delete** — X button next to todo
- **Toggle** — checkbox marks done/undone
- **Auto-save** — write to DB on any change

## Data Flow
1. User enters username on `/login` → API creates/gets user → sets cookie
2. UI calls `fetch('/api/todos')` with cookie → API returns user's todos
3. On change: UI → `fetch('/api/todos', {method: 'POST', body})` with cookie → API updates todos

## Error Handling
- If not authenticated → redirect to `/login`
- On DB error → show message to user
- Invalid cookie → redirect to `/login`

## Testing

### Unit Tests
- **Library**: Vitest + React Testing Library
- **Coverage**:
  - Types validation
  - Todo list components (render, add, delete)
  - API routes — all endpoints (GET, POST, DELETE, auth)

### Integration Tests
- Full flow: login → add todo → verify in list → delete → verify removed

### Test Structure
```
__tests__/
├── api/
│   ├── todos.test.ts    # API route tests
│   └── auth.test.ts     # Auth API tests
├── components/
│   └── TodoList.test.tsx # Component tests
└── utils/
    └── todo.test.ts     # Utility tests
```

### Running Tests
```bash
npm run test        # All tests
npm run test:watch  # Watch mode
```
