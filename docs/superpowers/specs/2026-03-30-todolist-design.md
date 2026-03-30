# Todo List — Design

## Architecture
- **Frontend**: Next.js (App Router) + React
- **Backend**: Next.js API Routes (`app/api/todos/route.ts`)
- **Storage**: File `data/todos.json` in project root
- **Styling**: CSS Modules or inline styles (minimal)

## Structure
```
app/
├── page.tsx          # Main page — todo list
├── layout.tsx       # Base layout
├── globals.css      # Minimal styles
└── api/todos/
    └── route.ts     # CRUD API for todos
data/
└── todos.json       # Todos data file
types/
└── todo.ts          # TypeScript types
```

## Functionality
- **View** — list all todos with checkboxes
- **Add** — input field + button/Enter
- **Edit** — click on todo text to edit
- **Delete** — X button next to todo
- **Toggle** — checkbox marks done/undone
- **Auto-save** — write to file on any change

## Data Flow
1. UI calls `fetch('/api/todos')` → API Route reads file → returns array
2. On change: UI → `fetch('/api/todos', {method: 'POST', body})` → API Route writes file → returns updated array

## Error Handling
- If file doesn't exist — create empty array
- On write error — show message to user

## Testing

### Unit Tests
- **Library**: Vitest + React Testing Library
- **Coverage**:
  - `types/todo.ts` — type validation
  - Todo list components (render, add, delete)
  - API route — all endpoints (GET, POST, DELETE)

### Integration Tests
- Full flow: add todo → verify in list → delete → verify removed

### Test Structure
```
__tests__/
├── api/
│   └── todos.test.ts    # API route tests
├── components/
│   └── TodoList.test.tsx # Component tests
└── utils/
    └── todo.test.ts     # Utility tests (if needed)
```

### Running Tests
```bash
npm run test        # All tests
npm run test:watch  # Watch mode
```
