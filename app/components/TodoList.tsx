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
  const dropZoneRef = useRef<HTMLDivElement>(null);

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
    <div>
      <div className="header">
        <h1>Todo List {username && `(${username})`}</h1>
        <button className="logout-button" onClick={logout}>
          Logout
        </button>
      </div>

      <input
        type="text"
        className="todo-input"
        placeholder="Add a todo..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />

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
}
