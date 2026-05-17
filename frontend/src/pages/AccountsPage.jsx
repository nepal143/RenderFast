import { useState, useEffect } from 'react'
import { getAccounts, addAccount, deleteAccount } from '../api'
import { Trash2, PlusCircle, KeyRound } from 'lucide-react'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')

  const load = async () => {
    const res = await getAccounts()
    setAccounts(res.data)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await addAccount(username, apiKey)
      setUsername('')
      setApiKey('')
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add account')
    }
  }

  const handleDelete = async (u) => {
    await deleteAccount(u)
    load()
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Kaggle Accounts</h1>

      {/* Add account form */}
      <form onSubmit={handleAdd} className="bg-gray-900 rounded-xl p-6 space-y-4 border border-gray-800">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <KeyRound size={18} /> Add Account
        </h2>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-4 flex-wrap">
          <input
            className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
            placeholder="Kaggle username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            className="flex-1 min-w-64 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
            placeholder="Kaggle API key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-brand hover:bg-brand-dark text-white font-semibold px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusCircle size={18} /> Add
          </button>
        </div>
        <p className="text-gray-500 text-xs">
          Your API key is stored locally and never sent anywhere except to Kaggle's API.
        </p>
      </form>

      {/* Account list */}
      <div className="space-y-3">
        {accounts.length === 0 && (
          <p className="text-gray-500">No accounts added yet.</p>
        )}
        {accounts.map((acc) => (
          <div
            key={acc.username}
            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div>
              <p className="font-semibold">{acc.username}</p>
              <p className="text-xs text-gray-500">
                {acc.active ? '✅ Active' : '⏸ Inactive'}
              </p>
            </div>
            <button
              onClick={() => handleDelete(acc.username)}
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
