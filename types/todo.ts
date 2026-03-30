export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  userId: string;
  createdAt: Date | string;
}

export interface User {
  id: string;
  username: string;
  createdAt: Date | string;
}
