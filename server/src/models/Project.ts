import mongoose, { Schema } from 'mongoose'
import { IProject } from '../types/express'

const projectSchema = new Schema<IProject>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  longDescription: { type: String },
  tags: [{ type: String }],
  githubUrl: { type: String },
  demoUrl: { type: String },
  images: [{ type: String }],
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  progress: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'on-hold'], default: 'active' },
  views: { type: Number, default: 0 },
  collaborators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  bookmarks: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
})

export default mongoose.model<IProject>('Project', projectSchema) 