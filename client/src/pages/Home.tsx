import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            ProjectLink
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            The LinkedIn for Student Projects. Showcase your work, connect with peers, and collaborate on amazing projects.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              to="/register"
              className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
            >
              Get Started
            </Link>
            <Link
              to="/projects"
              className="text-sm font-semibold leading-6 text-gray-900"
            >
              Browse Projects <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl lg:text-center">
            <h2 className="text-base font-semibold leading-7 text-primary">Showcase Your Work</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to share your projects
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.name} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    {feature.name}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    name: 'Upload Projects',
    description: 'Share your projects with detailed descriptions, tags, and links to repositories or demos.',
  },
  {
    name: 'Connect with Peers',
    description: 'Find and connect with other students working on similar projects or technologies.',
  },
  {
    name: 'Collaborate',
    description: 'Join forces with other students to work on exciting projects together.',
  },
] 