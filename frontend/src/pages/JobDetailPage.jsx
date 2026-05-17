import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getJob, triggerDownload, listFrames, getZipUrl } from '../api'
import { Download, RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
  running: 'bg-yellow-500',
  complete: 'bg-green-500',
  error: 'bg-red-500',
  queued: 'bg-gray-500',
}

export default function JobDetailPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [frames, setFrames] = useState([])
  const [downloading, setDownloading] = useState(false)
  const wsRef = useRef(null)

  const loadJob = async () => {
    const res = await getJob(jobId)
    setJob(res.data)
  }

  const loadFrames = async () => {
    const res = await listFrames(jobId)
    setFrames(res.data.frames || [])
  }

  // WebSocket for live progress
  useEffect(() => {
    loadJob()
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${window.location.host}/api/progress/ws/${jobId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setJob(data)
    }

    return () => ws.close()
  }, [jobId])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await triggerDownload(jobId)
      await loadFrames()
    } finally {
      setDownloading(false)
    }
  }

  if (!job) return <p className="text-gray-400">Loading...</p>

  const completedTasks = job.tasks?.filter((t) => t.status === 'complete').length || 0
  const totalTasks = job.tasks?.length || 1
  const progressPct = Math.round((completedTasks / totalTasks) * 100)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{job.blend_file}</h1>
          <p className="text-gray-500 text-sm">Job ID: {job.job_id} · {job.total_frames} total frames</p>
        </div>
        <button onClick={loadJob} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Overall progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span>Overall Progress</span>
          <span>{completedTasks}/{totalTasks} instances complete</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className="bg-brand h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">
          Status: <span className="font-semibold text-white">{job.status}</span>
        </p>
      </div>

      {/* Per-account task breakdown */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Kaggle Instances</h2>
        {job.tasks?.map((task, i) => (
          <div
            key={i}
            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{task.account}</p>
              <p className="text-xs text-gray-400">
                Frames {task.start_frame} → {task.end_frame} &nbsp;·&nbsp;
                {task.end_frame - task.start_frame + 1} frames
              </p>
              {task.failure_message && (
                <p className="text-xs text-red-400 mt-1">{task.failure_message}</p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${STATUS_COLORS[task.status] || 'bg-gray-700'} text-white`}
            >
              {task.status}
            </span>
          </div>
        ))}
      </div>

      {/* Download section */}
      {(job.status === 'complete' || job.status === 'partial') && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-lg">Download Frames</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-2"
            >
              <Download size={16} />
              {downloading ? 'Downloading from Kaggle...' : 'Fetch Frames from Kaggle'}
            </button>
            {frames.length > 0 && (
              <a
                href={getZipUrl(jobId)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-2"
              >
                <Download size={16} /> Download All as ZIP ({frames.length} frames)
              </a>
            )}
          </div>

          {/* Frame grid preview */}
          {frames.length > 0 && (
            <div>
              <p className="text-sm text-gray-400 mb-3">{frames.length} frames downloaded</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {frames.slice(0, 48).map((f) => (
                  <a
                    key={f}
                    href={`/frames/${jobId}/${f}`}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square bg-gray-800 rounded overflow-hidden border border-gray-700 hover:border-brand"
                  >
                    <img
                      src={`/frames/${jobId}/${f}`}
                      alt={f}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  </a>
                ))}
                {frames.length > 48 && (
                  <div className="aspect-square bg-gray-800 rounded border border-gray-700 flex items-center justify-center text-gray-500 text-xs">
                    +{frames.length - 48} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
