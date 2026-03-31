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
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between pb-4 mb-4 border-b">
        <h1 className="text-xl font-semibold text-white bg-burgundy-900 rounded px-3 py-2">Todo List {username && `(${username})`}</h1>
        <button className="border border-white text-white rounded px-3 py-1" onClick={logout}>Logout</button>
      </div>
      <div className="mb-4">
        <input
          type="text"
          className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-burgundy-500"
          placeholder="Add a todo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="upload-area border-2 border-dashed border-burgundy-600 rounded p-4 mb-4" onDrop={handleDrop} onDragOver={handleDragOver}>
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
        <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-burgundy-700 text-white rounded">Загрузить картинку</button>
        {uploadError && <p className="text-red-600 mt-2">{uploadError}</p>}
        {previewImage && (
          <div className="mt-2 text-center">
            <img src={previewImage} alt="Preview" className="mx-auto mb-2 max-w-xs" />
            <div className="flex justify-center gap-2">
              <button className="px-3 py-1 bg-burnt-600 text-white rounded" onClick={uploadImage} disabled={uploading}>{uploading ? 'Загрузка...' : 'Добавить'}</button>
              <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setPreviewImage(null); setSelectedFile(null); }}>
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className={`flex items-center p-2 bg-white rounded shadow-sm ${todo.completed ? 'opacity-70' : ''}`}>
            {todo.hasImage && (
              <img src={`/api/todos/${todo.id}/image`} alt={todo.text || 'Todo image'} className="w-20 h-20 object-cover rounded mr-3" />
            )}
            {todo.text && <span className={`flex-1 ${todo.completed ? 'line-through text-gray-500' : ''}`}>{todo.text}</span>}
            <input type="checkbox" className="w-4 h-4 mr-3" checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            <button className="text-gray-500 hover:text-red-600 ml-2" onClick={() => deleteTodo(todo.id)}>×</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
