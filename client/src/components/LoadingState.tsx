import React from 'react'

interface LoadingStateProps {
  message?: string
  isServerSpinUp?: boolean
}

export default function LoadingState({ message = 'Loading...', isServerSpinUp = false }: LoadingStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-pink-50 to-yellow-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{message}</h2>
        {isServerSpinUp && (
          <p className="text-gray-600">
            The server is waking up. This may take up to 50 seconds on the first request.
            Please wait...
          </p>
        )}
        <div className="mt-4 text-sm text-gray-500">
          {isServerSpinUp && (
            <p className="mb-2">
              This is normal for the free tier of Render.com.
              The server spins down after 15 minutes of inactivity.
            </p>
          )}
          <p>Your request will be processed automatically once the server is ready.</p>
        </div>
      </div>
    </div>
  )
} 