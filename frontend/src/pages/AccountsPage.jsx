import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getAccounts, addAccount, deleteAccount } from '../api'
import axios from 'axios'
import { Trash2, PlusCircle, KeyRound, LogIn, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

export default function AccountsPage() {
  const [accounts, setAccounts]       = useState([])
  const [username, setUsername]       = useState('')
  const [apiKey, setApiKey]           = useState('')
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [oauthEnabled, setOauthEnabled] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [showManual, setShowManual]   = useState(false)
  const location = useLocation()

  const load = async () => {
    const res = await getAccounts()
    setAccounts(res.data)
  }

  // Check OAuth config + handle redirect-back params
  useEffect(() => {
    load()

    axios.get('/api/accounts/oauth/config').then(res => {
      setOauthEnabled(res.data.enabled)
    })

    const params = new URLSearchParams(location.search)
    const oauthSuccess = params.get('oauth_success')
    const oauthError   = params.get('oauth_error')

    if (oauthSuccess) {
      setSuccess(`✅ Successfully connected Kaggle account: ${oauthSuccess}`)
      load()
      window.history.replaceState({}, '', '/accounts')
    }
    if (oauthError) {
      const messages = {
        invalid_state:           'OAuth state mismatch — please try again.',
        token_exchange_failed:   'Could not exchange token with Kaggle. Check your OAuth app settings.',
        no_token_in_response:    'Kaggle did not return a token. Check your OAuth app config.',
        could_not_fetch_username:'Logged in but could not fetch your Kaggle username.',
      }
      setError(messages[oauthError] || `OAuth error: ${oauthError}`)
      window.history.replaceState({}, '', '/accounts')
    }
  }, [])

  const handleOAuthLogin = async () => {
    setOauthLoading(true)
    setError('')
    try {
      const res = await axios.get('/api/accounts/oauth/start')
      // Open the Kaggle auth page in the same tab
      window.location.href = res.data.url
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to start OAuth flow.')
      setOauthLoading(false)
    }
  }

  const handleManualAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await addAccount(username, apiKey)
      setUsername('')
      setApiKey('')
      setSuccess(`✅ Account '${username}' added.`)
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
      <h1 className="text-2xl font-bold">Kaggle Accounts</h1>
      <p className="text-gray-400 text-sm -mt-4">
        Add multiple Kaggle accounts. RenderFast will distribute rendering across all active accounts in parallel.
      </p>

      {/* Feedback banners */}
      {success && (
        <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 text-green-300 rounded-lg px-4 py-3 text-sm">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ── OAuth Login ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <LogIn size={18} className="text-brand" /> Connect a Kaggle Account
        </h2>

        {oauthEnabled ? (
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">
              Click below — you'll be sent to Kaggle to authorise RenderFast. No API key needed.
            </p>
            <button
              onClick={handleOAuthLogin}
              disabled={oauthLoading}
              className="flex items-center gap-3 bg-[#20beff] hover:bg-[#00a9e0] disabled:opacity-50 text-black font-bold px-6 py-3 rounded-lg text-base transition-colors"
            >
              <img
                src="https://www.kaggle.com/favicon.ico"
                alt="Kaggle"
                className="w-5 h-5"
                onError={e => e.target.style.display='none'}
              />
              {oauthLoading ? 'Redirecting to Kaggle...' : 'Login with Kaggle'}
            </button>
            <p className="text-xs text-gray-500">
              This uses OAuth2 — RenderFast never sees your Kaggle password. &nbsp;
              <button className="underline text-gray-400 hover:text-white" onClick={() => setShowManual(m => !m)}>
                Enter API key manually instead
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-yellow-900/30 border border-yellow-700/50 text-yellow-300 rounded-lg px-4 py-3 text-sm space-y-2">
              <p className="font-semibold">OAuth not configured yet</p>
              <p>To enable one-click login, register RenderFast as an OAuth app on Kaggle:</p>
              <ol className="list-decimal list-inside space-y-1 text-yellow-200/80">
                <li>
                  Go to&nbsp;
                  <a
                    href="https://www.kaggle.com/settings/connected-applications"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-[#20beff] inline-flex items-center gap-1"
                  >
                    Kaggle → Settings → Connected Applications <ExternalLink size={12} />
                  </a>
                </li>
                <li>Click <strong>New Application</strong></li>
                <li>
                  Set <strong>Redirect URI</strong> to:&nbsp;
                  <code className="bg-black/40 px-1 rounded">http://localhost:8000/api/accounts/oauth/callback</code>
                </li>
                <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                <li>
                  Create&nbsp;<code className="bg-black/40 px-1 rounded">backend/.env</code>&nbsp;from&nbsp;
                  <code className="bg-black/40 px-1 rounded">.env.example</code>&nbsp;and fill them in
                </li>
                <li>Restart the backend — the Login button will appear</li>
              </ol>
            </div>
            <p className="text-xs text-gray-500">
              Until then, use the manual API key form below. &nbsp;
              <a
                href="https://www.kaggle.com/settings/account"
                target="_blank"
                rel="noreferrer"
                className="underline text-gray-400 hover:text-white inline-flex items-center gap-1"
              >
                Get your Kaggle API key <ExternalLink size={11} />
              </a>
            </p>
          </div>
        )}
      </div>

      {/* ── Manual API key form ───────────────────────────────────────────── */}
      {(!oauthEnabled || showManual) && (
        <form onSubmit={handleManualAdd} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <KeyRound size={18} /> Manual API Key
          </h2>
          <div className="flex gap-4 flex-wrap">
            <input
              className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-brand"
              placeholder="Kaggle username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              className="flex-1 min-w-64 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-brand font-mono text-sm"
              placeholder="API key (from kaggle.json)"
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
            API keys are stored locally in <code>backend/data/kaggle_accounts.json</code> and never sent anywhere except to Kaggle's API.
          </p>
        </form>
      )}

      {/* ── Account list ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Connected Accounts ({accounts.length})</h2>
        {accounts.length === 0 && (
          <p className="text-gray-500">No accounts connected yet.</p>
        )}
        {accounts.map((acc, i) => (
          <div
            key={acc.username}
            className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm">
                {i + 1}
              </div>
              <div>
                <p className="font-semibold">{acc.username}</p>
                <p className="text-xs text-gray-500">{acc.active ? '● Active' : '○ Inactive'}</p>
              </div>
            </div>
            <button
              onClick={() => handleDelete(acc.username)}
              className="text-red-400 hover:text-red-300 p-1"
              title="Remove account"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
