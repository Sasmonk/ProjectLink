import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path
  return (
    <nav className="bg-gradient-to-r from-blue-50 via-pink-50 to-yellow-50 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-extrabold bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent drop-shadow">ProjectLink</span>
            </Link>
          </div>
          
          <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
            <Link
              to="/projects"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition relative ${
                isActive('/projects')
                  ? 'text-primary after:absolute after:left-0 after:-bottom-1 after:w-full after:h-1 after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:via-orange-400 after:to-yellow-400'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              Projects
            </Link>
            <Link
              to="/explore"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition relative ${
                isActive('/explore')
                  ? 'text-primary after:absolute after:left-0 after:-bottom-1 after:w-full after:h-1 after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:via-orange-400 after:to-yellow-400'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              Explore
            </Link>
          </div>

          <div className="flex items-center">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-500 hover:text-primary mr-4"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 px-4 py-2 text-sm font-semibold text-white shadow hover:scale-105 transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
} 