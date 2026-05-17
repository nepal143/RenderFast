import { useEffect, useState } from 'react'
import { getJobs } from '../api'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
  running: 'text-yellow-400',
  complete: 'text-green-400',
  partial: 'text-orange-400',
  error: 'text-red-400',
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([])

  const load = async () => {
    const res = await getJobs()
    setJobs(res.data.reverse())
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Render Jobs</h1>
        <button onClick={load} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {jobs.length === 0 && (
        <p className="text-gray-500">No jobs yet. Submit one from the Render page.</p>
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <Link
            key={job.job_id}
            to={`/jobs/${job.job_id}`}
            className="block bg-gray-900 border border-gray-800 hover:border-brand rounded-xl px-5 py-4 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{job.blend_file}</p>
                <p className="text-xs text-gray-500">Job ID: {job.job_id} · {job.total_frames} frames</p>
              </div>
              <span className={`font-semibold uppercase text-sm ${STATUS_COLORS[job.status] || 'text-gray-400'}`}>
                {job.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
