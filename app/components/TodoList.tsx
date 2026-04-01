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

      {/* Audio area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 text-center hover:border-indigo-400 transition">
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
        <div className="flex justify-center gap-3">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition ${
              isRecording
                ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isRecording ? `⏹ ${formatDuration(recordingDuration)}` : '🎤 Записать аудио'}
          </button>
          <button
            onClick={() => audioInputRef.current?.click()}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
          >
            📎 Прикрепить аудио
          </button>
        </div>
        {isRecording && (
          <button
            onClick={cancelRecording}
            className="mt-2 px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition"
          >
            Отменить запись
          </button>
        )}
        {audioUploadError && <p className="text-red-500 text-sm mt-2">{audioUploadError}</p>}
        {audioPreviewUrl && (
          <div className="mt-4">
            <audio
              ref={audioPreviewRef}
              src={audioPreviewUrl}
              controls
              className="mx-auto mb-3"
            />
            <p className="text-sm text-gray-500 mb-3">
              Длительность: {formatDuration(recordingDuration)}
            </p>
            <div className="flex justify-center gap-2">
              <button
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                onClick={selectedAudioFile ? uploadAudioFile : uploadRecordedAudio}
                disabled={uploadingAudio}
              >
                {uploadingAudio ? 'Загрузка...' : 'Добавить'}
              </button>
              <button
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                onClick={clearAudioPreview}
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
            {todo.hasAudio && (
              <div className="flex-shrink-0 flex items-center gap-2">
                <span className="text-lg">🎤</span>
                <audio
                  src={`/api/todos/${todo.id}/audio`}
                  controls
                  className="h-8"
                />
                {todo.audioDuration && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDuration(todo.audioDuration)}
                  </span>
                )}
              </div>
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
