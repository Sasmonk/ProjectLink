import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// @ts-ignore
const API_URL = import.meta.env.VITE_API_URL

export default function CreateProject() {
  const navigate = useNavigate()
  const { token } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    longDescription: '',
    tags: '',
    githubUrl: '',
    demoUrl: '',
    progress: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
          progress: Number(formData.progress),
        }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to create project')
      }
      // Success: redirect to Browse Projects (which will auto-refresh)
      navigate('/projects')
    } catch (error: any) {
      setError(error.message || 'Error creating project')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Project</h1>
          {error && <div className="text-red-600 mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Project Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter your project title"
              />
            </div>
            {/* Short Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Short Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Brief description of your project"
              />
            </div>
            {/* Long Description */}
            <div>
              <label htmlFor="longDescription" className="block text-sm font-medium text-gray-700">
                Detailed Description
              </label>
              <textarea
                id="longDescription"
                name="longDescription"
                required
                value={formData.longDescription}
                onChange={handleChange}
                rows={6}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Provide a detailed description of your project, including features, technologies used, and any other relevant information"
              />
            </div>
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                name="tags"
                required
                value={formData.tags}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter tags separated by commas (e.g., AI, Machine Learning, Python)"
              />
            </div>
            {/* GitHub URL */}
            <div>
              <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700">
                GitHub Repository URL
              </label>
              <input
                type="url"
                id="githubUrl"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://github.com/username/repository"
              />
            </div>
            {/* Demo URL */}
            <div>
              <label htmlFor="demoUrl" className="block text-sm font-medium text-gray-700">
                Live Demo URL
              </label>
              <input
                type="url"
                id="demoUrl"
                name="demoUrl"
                value={formData.demoUrl}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://your-demo-url.com"
              />
            </div>
            {/* Progress */}
            <div>
              <label htmlFor="progress" className="block text-sm font-medium text-gray-700">
                Project Completion (%)
              </label>
              <input
                type="range"
                id="progress"
                name="progress"
                min={0}
                max={100}
                value={formData.progress}
                onChange={handleChange}
                className="w-full mt-1"
              />
              <div className="text-sm text-gray-600 mt-1">{formData.progress}% complete</div>
            </div>
            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 