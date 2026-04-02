# Minimalist Indigo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace vanilla CSS styles with Tailwind utility classes and redesign the Todo app with a minimalist indigo-accent theme.

**Architecture:** Direct conversion — all CSS classes in JSX replaced with Tailwind utilities, custom styles removed from globals.css, custom color palette replaced with Tailwind's built-in indigo. No new components or structural changes.

**Tech Stack:** Next.js 14 (App Router), Tailwind CSS 3, TypeScript, React

---

### Task 1: Update Tailwind config — remove custom colors

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Replace custom colors in tailwind.config.js**

Remove `burgundy`, `burnt`, and `beige` from the `colors` object. No custom colors needed — Tailwind ships with `indigo` by default.

```js
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {}
  },
  plugins: [],
}
```

- [ ] **Step 2: Verify no old color references remain**

Check: no `burgundy`, `burnt`, or `beige` in the file.

---

### Task 2: Clean globals.css — remove all custom styles

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css content**

Remove ALL custom CSS classes. Keep only Tailwind directives and box-sizing reset.

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

---

### Task 3: Redesign login page with Tailwind

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Replace login page with Tailwind classes**

Replace `login-container`, `login-input`, `login-button` with Tailwind utilities. Centered form, max-width-sm, indigo button.

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (res.ok) {
      router.push('/');
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-32 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Login</h1>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          type="submit"
          className="w-full mt-4 px-4 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
```

---

### Task 4: Redesign TodoList component with Tailwind

**Files:**
- Modify: `app/components/TodoList.tsx`

- [ ] **Step 1: Replace all JSX classes with Tailwind utilities**

Full file content — all logic preserved, only className values and structure updated:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Todo } from '@/types/todo';

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkAuth();
    fetchTodos();
  }, []);

  async function checkAuth() {
    const res = await fetch('/api/auth');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/login';
    } else {
      setUsername(data.user.username);
    }
  }

  async function fetchTodos() {
    const res = await fetch('/api/todos');
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();
    setTodos(data);
  }

  async function addTodo() {
    if (!input.trim()) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', text: input }),
    });
    const data = await res.json();
    setTodos(data);
    setInput('');
  }

  async function toggleTodo(id: string) {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    const data = await res.json();
    setTodos(data);
  }

  async function deleteTodo(id: string) {
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const data = await res.json();
    setTodos(data);
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      addTodo();
    }
  }
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900">
          Todo List{username && <span className="text-gray-400 font-normal ml-2">({username})</span>}
        </h1>
        <button
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          onClick={logout}
        >
          Logout
        </button>
      </div>

      {/* Input */}
      <div className="mb-6">
        <input
          type="text"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
          placeholder="Add a todo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Upload area */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 text-center hover:border-indigo-400 transition"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
        >
          Загрузить картинку
        </button>
        {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
        {previewImage && (
          <div className="mt-4">
            <img src={previewImage} alt="Preview" className="mx-auto mb-3 max-w-xs rounded-lg" />
            <div className="flex justify-center gap-2">
              <button
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                onClick={uploadImage}
                disabled={uploading}
              >
                {uploading ? 'Загрузка...' : 'Добавить'}
              </button>
              <button
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                onClick={() => { setPreviewImage(null); setSelectedFile(null); }}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Todo list */}
      <ul className="divide-y divide-gray-100">
        {todos.map((todo) => (
          <li key={todo.id} className={`flex items-center gap-3 py-3 ${todo.completed ? 'opacity-60' : ''}`}>
            {todo.hasImage && (
              <img
                src={`/api/todos/${todo.id}/image`}
                alt={todo.text || 'Todo image'}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
              />
            )}
            {todo.text && (
              <span className={`flex-1 text-gray-900 ${todo.completed ? 'line-through text-gray-400' : ''}`}>
                {todo.text}
              </span>
            )}
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <button
              className="text-gray-400 hover:text-red-500 text-xl leading-none ml-1 transition"
              onClick={() => deleteTodo(todo.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Key changes:
- Outer: `max-w-2xl mx-auto px-4 py-8` — no card frame
- Header: `border-b border-gray-200` separator
- Input: `focus:ring-indigo-500` indigo focus ring
- Upload: `border-dashed hover:border-indigo-400` indigo hover
- Todos: `divide-y divide-gray-100` instead of individual shadows
- Checkbox: `text-indigo-600` indigo accent
- Hidden file input: `className="hidden"` instead of inline style

---

### Task 5: Run tests and verify build

- [ ] **Step 1: Run tests**

Run: `npm run test`
Expected: All tests pass.

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors.

---

### Task 6: Commit the redesign

- [ ] **Step 1: Commit**

```bash
git add tailwind.config.js app/globals.css app/login/page.tsx app/components/TodoList.tsx
git commit -m "redesign: minimalist indigo theme with Tailwind utilities"
```
