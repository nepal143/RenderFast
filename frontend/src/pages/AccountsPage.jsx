import { useState, useEffect } from 'react'
import { getAccounts, addAccount, deleteAccount } from '../api'
import { Trash2, PlusCircle, KeyRound } from 'lucide-react'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey]     = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')

  const load = async () => {
    const res = await getAccounts()
    setAccounts(res.data)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await addAccount(username, apiKey)
      setUsername('')
      setApiKey('')
      setSuccess(`Account '${username}' added.`)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add account')
    }
  }

  const handleDelete = async (u) => {
    await deleteAccount(u)
    setAccounts(a => a.filter(x => x.username !== u))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Kaggle Accounts</h1>
        <p className="text-gray-400 text-sm mt-1">
          Add multiple Kaggle accounts. RenderFast distributes rendering across all active accounts in parallel.
        </p>
      </div>

      {success && (
        <div className="bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Add Account */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <KeyRound size={18} className="text-brand" /> Add Kaggle Account
        </h2>
        <p className="text-gray-400 text-sm">
          Get your API key from{' '}
          <a href="https://www.kaggle.com/settings/account" target="_blank" rel="noreferrer" className="text-brand underline">
            kaggle.com/settings/account
          </a>{' '}
          → <span className="font-mono bg-gray-800 px-1 rounded">Create New Token</span> → opens{' '}
          <span className="font-mono bg-gray-800 px-1 rounded">kaggle.json</span>. Copy the values below.
        </p>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            required
            placeholder="Kaggle username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand"
          />
          <input
            required
            placeholder="API key (from kaggle.json)"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand font-mono"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-brand hover:bg-brand/80 text-black font-semibold rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <PlusCircle size={16} /> Add Account
          </button>
        </form>
      </div>

      {/* Account List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-lg">Connected Accounts ({accounts.length})</h2>
        {accounts.length === 0 ? (
          <p className="text-gray-500 text-sm">No accounts yet. Add at least one to start rendering.</p>
        ) : (
          <ul className="space-y-2">
            {accounts.map((a, i) => (
              <li key={a.username} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold bg-gray-700 text-gray-300 rounded-full w-6 h-6 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm">{a.username}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${a.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                    {a.active ? 'active' : 'inactive'}
                  </span>
                </div>
                <button onClick={() => handleDelete(a.username)} className="text-gray-500 hover:text-red-400 transition-colors" title="Remove">
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
