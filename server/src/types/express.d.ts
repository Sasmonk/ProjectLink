import { Document, Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      userId: string;
      user: IUser;
    }
  }
}

export interface IComment {
  _id?: Types.ObjectId;
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  institution?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  isAdmin: boolean;
  banned: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  longDescription?: string;
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  images?: string[];
  author: Types.ObjectId;
  progress: number;
  status: 'active' | 'completed' | 'on-hold';
  views: number;
  collaborators: Types.ObjectId[];
  bookmarks: Types.ObjectId[];
  likes: Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
} 