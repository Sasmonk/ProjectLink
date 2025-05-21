export interface User {
  _id: string;
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
  banned?: boolean;
}

export interface Project {
  _id: string;
  title: string;
  description: string;
  owner: User;
  members: User[];
  skills: string[];
  status: 'open' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
  likes: string[];
  comments: any[];
} 