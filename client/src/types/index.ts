export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  following: string[];
  name?: string;
  avatar?: string;
  institution?: string;
  banned?: boolean;
  createdAt?: string;
}

export interface Project {
  id: string;
  _id?: string;
  title: string;
  description: string;
  longDescription?: string;
  likes: string[];
  comments: string[];
  owner?: User;
  createdAt?: string;
  tags?: string[];
  githubUrl?: string;
  demoUrl?: string;
  progress?: number;
  status?: string;
  collaborators?: User[];
} 