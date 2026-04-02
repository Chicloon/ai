'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const inputClass =
  'w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder:text-slate-500 shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

const buttonClass =
  'w-full rounded-xl bg-burgundy-700 py-3 text-sm font-semibold text-white shadow-lg shadow-burgundy-900/30 transition hover:bg-burgundy-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700/60 bg-slate-900/85 p-8 shadow-2xl shadow-black/40 backdrop-blur-md">
        <h1 className="mb-2 text-center text-2xl font-semibold tracking-tight text-slate-50">
          Login
        </h1>
        <p className="mb-8 text-center text-sm text-slate-400">
          Enter your username to continue
        </p>
        <form className="space-y-4" onSubmit={handleLogin}>
          <input
            type="text"
            className={inputClass}
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <button type="submit" className={buttonClass}>
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
