'use client';

import { useState, useEffect, useRef } from 'react';
import { Marck_Script } from 'next/font/google';
import { Todo } from '@/types/todo';

const usernameFont = Marck_Script({
  weight: '400',
  subsets: ['latin', 'cyrillic'],
});

const fieldClass =
  'w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

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
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/85 p-6 shadow-2xl shadow-black/40 backdrop-blur-md">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-50">
            Todo List
            {username && (
              <span
                className={`${usernameFont.className} ml-3 inline-block rounded-lg bg-burgundy-900/90 px-4 py-1.5 text-2xl leading-none text-slate-100`}
              >
                {username}
              </span>
            )}
          </h1>
          <button
            type="button"
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            onClick={logout}
          >
            Logout
          </button>
        </header>

        <div className="mb-5">
          <input
            type="text"
            className={fieldClass}
            placeholder="Add a todo..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div
          className="mb-6 rounded-lg border border-dashed border-slate-600 bg-slate-800/40 px-3 py-2 text-center transition hover:border-burgundy-600/70"
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
          <p className="mb-1.5 text-xs leading-snug text-slate-400">
            JPEG или PNG, до 10 MB — перетащите сюда или выберите файл
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-burgundy-700 px-3 py-1 text-xs font-medium text-white shadow shadow-burgundy-950/30 transition hover:bg-burgundy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Загрузить картинку
          </button>
          {uploadError && (
            <p className="mt-2 text-xs text-red-400">{uploadError}</p>
          )}
          {previewImage && (
            <div className="mt-4">
              <img
                src={previewImage}
                alt="Preview"
                className="mx-auto mb-3 max-h-48 max-w-xs rounded-lg object-contain ring-1 ring-slate-600"
              />
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-burnt-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-burnt-500 disabled:opacity-50"
                  onClick={uploadImage}
                  disabled={uploading}
                >
                  {uploading ? 'Загрузка...' : 'Добавить'}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                  onClick={() => {
                    setPreviewImage(null);
                    setSelectedFile(null);
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className={`flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 transition ${todo.completed ? 'opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded border-slate-500"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
                aria-label={todo.text ? `Toggle: ${todo.text}` : 'Toggle todo'}
              />
              {todo.hasImage && (
                <img
                  src={`/api/todos/${todo.id}/image`}
                  alt={todo.text || 'Todo image'}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-slate-600"
                />
              )}
              {todo.text && (
                <span
                  className={`min-w-0 flex-1 text-sm ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                >
                  {todo.text}
                </span>
              )}
              {!todo.text && todo.hasImage && (
                <span className="min-w-0 flex-1" aria-hidden />
              )}
              <button
                type="button"
                className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-slate-500 transition hover:bg-red-950/50 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50"
                onClick={() => deleteTodo(todo.id)}
                aria-label="Delete"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
