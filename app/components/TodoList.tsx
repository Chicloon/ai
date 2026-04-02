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

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioUploadError, setAudioUploadError] = useState<string | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    checkAuth();
    fetchTodos();
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (audioPreviewUrl) {
        URL.revokeObjectURL(audioPreviewUrl);
      }
    };
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

  function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function startRecording() {
    setAudioUploadError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioPreviewUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 300) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setAudioUploadError('Не удалось получить доступ к микрофону');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  function cancelRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  async function uploadRecordedAudio() {
    if (!audioBlob) return;
    setUploadingAudio(true);
    setAudioUploadError(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('duration', String(recordingDuration));

    try {
      const res = await fetch('/api/todos/upload-audio', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setAudioUploadError(data.error || 'Ошибка загрузки');
        return;
      }
      setTodos(data);
      clearAudioPreview();
    } catch {
      setAudioUploadError('Ошибка загрузки');
    } finally {
      setUploadingAudio(false);
    }
  }

  function handleAudioFileSelect(file: File) {
    setAudioUploadError(null);
    const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg'];
    if (!allowedTypes.includes(file.type)) {
      setAudioUploadError('Поддерживаются только WebM, OGG, WAV, MP3');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setAudioUploadError('Файл слишком большой (макс. 10MB)');
      return;
    }
    setSelectedAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioPreviewUrl(url);
    setAudioBlob(file);

    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setRecordingDuration(audio.duration);
    };
  }

  async function uploadAudioFile() {
    if (!selectedAudioFile) return;
    setUploadingAudio(true);
    setAudioUploadError(null);

    const formData = new FormData();
    formData.append('audio', selectedAudioFile);
    formData.append('duration', String(recordingDuration));

    try {
      const res = await fetch('/api/todos/upload-audio', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setAudioUploadError(data.error || 'Ошибка загрузки');
        return;
      }
      setTodos(data);
      clearAudioPreview();
    } catch {
      setAudioUploadError('Ошибка загрузки');
    } finally {
      setUploadingAudio(false);
    }
  }

  function clearAudioPreview() {
    setAudioBlob(null);
    setSelectedAudioFile(null);
    setRecordingDuration(0);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
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

        <div className="mb-6 rounded-lg border border-dashed border-slate-600 bg-slate-800/40 px-3 py-3 text-center transition hover:border-burgundy-600/70">
          <input
            type="file"
            ref={audioInputRef}
            accept="audio/webm,audio/ogg,audio/wav,audio/mpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAudioFileSelect(file);
            }}
          />
          <p className="mb-2 text-xs text-slate-400">
            WebM, OGG, WAV, MP3 — запись с микрофона или файл
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`rounded-md px-3 py-1.5 text-xs font-medium text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                isRecording
                  ? 'animate-pulse bg-red-700 hover:bg-red-600 focus-visible:ring-red-500/80'
                  : 'bg-burgundy-700 hover:bg-burgundy-600 focus-visible:ring-burgundy-500/80'
              }`}
            >
              {isRecording
                ? `⏹ ${formatDuration(recordingDuration)}`
                : '🎤 Записать аудио'}
            </button>
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-burgundy-600/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Прикрепить аудио
            </button>
          </div>
          {isRecording && (
            <button
              type="button"
              onClick={cancelRecording}
              className="mt-2 text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              Отменить запись
            </button>
          )}
          {audioUploadError && (
            <p className="mt-2 text-xs text-red-400">{audioUploadError}</p>
          )}
          {audioPreviewUrl && (
            <div className="mt-4">
              <audio
                ref={audioPreviewRef}
                src={audioPreviewUrl}
                controls
                className="mx-auto mb-2 h-9 max-w-full"
              />
              <p className="mb-3 text-xs text-slate-500">
                Длительность: {formatDuration(recordingDuration)}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-burnt-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-burnt-500 disabled:opacity-50"
                  onClick={selectedAudioFile ? uploadAudioFile : uploadRecordedAudio}
                  disabled={uploadingAudio}
                >
                  {uploadingAudio ? 'Загрузка...' : 'Добавить'}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
                  onClick={clearAudioPreview}
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
              className={`flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/50 p-3 transition ${todo.completed ? 'opacity-60' : ''}`}
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
              {todo.hasAudio && (
                <div className="flex min-w-0 max-w-full shrink items-center gap-2 sm:max-w-[min(100%,16rem)]">
                  <span className="text-base" aria-hidden>
                    🎤
                  </span>
                  <audio
                    src={`/api/todos/${todo.id}/audio`}
                    controls
                    className="h-8 max-w-full"
                  />
                  {todo.audioDuration != null && (
                    <span className="whitespace-nowrap text-xs text-slate-500">
                      {formatDuration(todo.audioDuration)}
                    </span>
                  )}
                </div>
              )}
              {todo.text ? (
                <span
                  className={`min-w-0 flex-1 text-sm ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}
                >
                  {todo.text}
                </span>
              ) : (
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
