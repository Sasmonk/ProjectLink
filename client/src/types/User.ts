export interface User {
  id: string;
  name: string;
  email: string;
  institution: string;
  avatar: string;
  isAdmin: boolean;
  skills: string[];
  followers: string[];
  following: string[];
  createdAt: string;
  updatedAt: string;
} 