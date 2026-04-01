export interface Todo {
  id: string;
  text: string | null;
  completed: boolean;
  userId: string;
  createdAt: Date | string;
  hasImage: boolean;
  hasAudio: boolean;
  audioDuration?: number;
}

export interface User {
  id: string;
  username: string;
  createdAt: Date | string;
}
