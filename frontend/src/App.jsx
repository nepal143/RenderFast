import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import AccountsPage from './pages/AccountsPage'
import RenderPage from './pages/RenderPage'
import JobsPage from './pages/JobsPage'
import JobDetailPage from './pages/JobDetailPage'
import { Cpu } from 'lucide-react'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/* Navbar */}
        <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-8">
          <div className="flex items-center gap-2 text-brand font-bold text-xl">
            <Cpu size={24} />
            RenderFast
          </div>
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive ? 'text-brand font-semibold' : 'text-gray-400 hover:text-white'
            }
          >
            Render
          </NavLink>
          <NavLink
            to="/accounts"
            className={({ isActive }) =>
              isActive ? 'text-brand font-semibold' : 'text-gray-400 hover:text-white'
            }
          >
            Accounts
          </NavLink>
          <NavLink
            to="/jobs"
            className={({ isActive }) =>
              isActive ? 'text-brand font-semibold' : 'text-gray-400 hover:text-white'
            }
          >
            Jobs
          </NavLink>
        </nav>

        {/* Page content */}
        <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<RenderPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
