import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 h-12 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-teal-600" />
        <Link to="/" className="font-medium text-gray-900 text-sm">
          PriceTracker
        </Link>
      </div>
      <div className="flex items-center gap-1">
        <Link
          to="/"
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100"
        >
          Dashboard
        </Link>
        <Link
          to="/alerts"
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100"
        >
          My alerts
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-medium text-teal-800">
          {user?.email?.[0].toUpperCase()}
        </div>
        <span className="text-sm text-gray-500">{user?.email}</span>
        <button
          onClick={handleLogout}
          className="text-sm text-gray-400 hover:text-red-500 px-2 py-1 rounded"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
