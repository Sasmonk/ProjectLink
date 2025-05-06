import mongoose, { Schema, Document } from 'mongoose'

export interface IProject extends Document {
  title: string
  description: string
  longDescription?: string
  tags: string[]
  githubUrl?: string
  demoUrl?: string
  images?: string[]
  author: mongoose.Types.ObjectId
  progress?: number
  createdAt: Date
  updatedAt: Date
  likes: mongoose.Types.ObjectId[]
  comments: { user: mongoose.Types.ObjectId, text: string, createdAt: Date }[]
}

const projectSchema = new Schema<IProject>({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
  },
  longDescription: {
    type: String,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  githubUrl: {
    type: String,
    trim: true,
  },
  demoUrl: {
    type: String,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  likes: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: [],
  }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
})

export default mongoose.model<IProject>('Project', projectSchema) 