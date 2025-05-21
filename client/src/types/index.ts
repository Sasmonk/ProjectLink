export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  following: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  likes: number;
  comments: number;
  // ... existing code ...
} 