import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { submitJob } from '../api'
import { Upload, Film } from 'lucide-react'

export default function RenderPage() {
  const [file, setFile] = useState(null)
  const [totalFrames, setTotalFrames] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return
    setError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('blend_file', file)
    formData.append('total_frames', totalFrames)

    try {
      const res = await submitJob(formData)
      navigate(`/jobs/${res.data.job_id}`)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">New Render Job</h1>
        <p className="text-gray-400 mt-1">
          Upload your .blend file and RenderFast will distribute rendering across all your Kaggle accounts in parallel.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-6"
      >
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Blender File (.blend)</label>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 hover:border-brand rounded-xl p-10 cursor-pointer transition-colors">
            <Upload size={36} className="text-gray-500 mb-3" />
            <span className="text-gray-400">
              {file ? file.name : 'Click or drag & drop your .blend file here'}
            </span>
            <input
              type="file"
              accept=".blend"
              className="hidden"
              onChange={(e) => setFile(e.target.files[0])}
              required
            />
          </label>
        </div>

        {/* Frame count */}
        <div>
          <label className="block text-sm font-medium mb-2">
            <Film size={16} className="inline mr-1" />
            Total Frames
          </label>
          <input
            type="number"
            min={1}
            value={totalFrames}
            onChange={(e) => setTotalFrames(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-40 focus:outline-none focus:border-brand"
            required
          />
          <p className="text-gray-500 text-xs mt-1">
            Frames will be split evenly across your active Kaggle accounts.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-brand hover:bg-brand-dark disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-lg w-full text-lg"
        >
          {loading ? 'Submitting...' : '🚀 Start Rendering'}
        </button>
      </form>
    </div>
  )
}
