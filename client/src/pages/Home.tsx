import { Link } from 'react-router-dom'
import { Upload, Users, Handshake, Rocket, Search, Star } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50 flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center py-20 px-4 text-center bg-gradient-to-br from-primary/10 via-white to-yellow-50">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-4 drop-shadow-lg">
          Welcome to <span className="text-primary">ProjectLink</span>
        </h1>
        <p className="mt-4 text-xl sm:text-2xl text-gray-700 max-w-2xl mx-auto">
          The professional platform for student projects. Showcase your work, connect with peers, and collaborate on amazing ideas.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="rounded-full bg-primary px-8 py-3 text-lg font-semibold text-white shadow-lg hover:bg-primary/90 transition"
          >
            Get Started
          </Link>
          <Link
            to="/projects"
            className="text-lg font-semibold leading-6 text-primary hover:underline flex items-center gap-2"
          >
            <Search className="w-5 h-5" /> Browse Projects
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary uppercase tracking-wider">Features</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to share and discover projects
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-4xl lg:mt-20 lg:max-w-none">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col items-center bg-gradient-to-br from-primary/5 to-yellow-50 rounded-2xl shadow p-8 h-full">
                  <div className="mb-4 text-primary">
                    {feature.icon}
                  </div>
                  <dt className="text-lg font-semibold text-gray-900 mb-2 text-center">{feature.name}</dt>
                  <dd className="text-base text-gray-600 text-center">{feature.description}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gradient-to-br from-yellow-50 via-white to-blue-50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-primary text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {steps.map((step, idx) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="mb-4 bg-primary/10 rounded-full p-4">
                  {step.icon}
                </div>
                <div className="text-2xl font-bold text-primary mb-2">Step {idx + 1}</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">{step.title}</div>
                <div className="text-base text-gray-600">{step.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final Call to Action */}
      <div className="bg-primary py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">Ready to share your project?</h2>
        <p className="text-lg text-primary-100 mb-8">Join ProjectLink and connect with a global community of student innovators.</p>
        <Link
          to="/register"
          className="inline-block rounded-full bg-white px-8 py-3 text-lg font-semibold text-primary shadow-lg hover:bg-primary/10 transition"
        >
          Get Started Now
        </Link>
      </div>
    </div>
  )
}

const features = [
  {
    name: 'Upload Projects',
    description: 'Share your projects with detailed descriptions, tags, and links to repositories or demos.',
    icon: <Upload className="w-10 h-10" />,
  },
  {
    name: 'Connect with Peers',
    description: 'Find and connect with other students working on similar projects or technologies.',
    icon: <Users className="w-10 h-10" />,
  },
  {
    name: 'Collaborate',
    description: 'Join forces with other students to work on exciting projects together.',
    icon: <Handshake className="w-10 h-10" />,
  },
]

const steps = [
  {
    title: 'Create Your Profile',
    description: 'Sign up and set up your student profile with your skills and interests.',
    icon: <Star className="w-8 h-8 text-primary" />,
  },
  {
    title: 'Upload & Discover Projects',
    description: 'Showcase your work and explore projects from students worldwide.',
    icon: <Rocket className="w-8 h-8 text-primary" />,
  },
  {
    title: 'Connect & Collaborate',
    description: 'Find collaborators, join teams, and build something amazing together.',
    icon: <Users className="w-8 h-8 text-primary" />,
  },
] 