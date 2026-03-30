'use client';

import { useState, useEffect } from 'react';
import { Todo } from '@/types/todo';

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [username, setUsername] = useState('');

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
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
            <input
              type="checkbox"
              className="todo-checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id)}
            />
            <span className="todo-text">{todo.text}</span>
            <button className="todo-delete" onClick={() => deleteTodo(todo.id)}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
