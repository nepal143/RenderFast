import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Accounts
export const getAccounts = () => api.get('/accounts/')
export const addAccount = (username, api_key) =>
  api.post('/accounts/', { username, api_key })
export const deleteAccount = (username) => api.delete(`/accounts/${username}`)

// Jobs
export const getJobs = () => api.get('/jobs/')
export const getJob = (jobId) => api.get(`/jobs/${jobId}`)
export const submitJob = (formData) =>
  api.post('/jobs/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

// Progress
export const getProgress = (jobId) => api.get(`/progress/${jobId}`)

// Download
export const triggerDownload = (jobId) => api.post(`/download/${jobId}`)
export const listFrames = (jobId) => api.get(`/download/${jobId}/frames`)
export const getZipUrl = (jobId) => `/api/download/${jobId}/zip`

export default api
