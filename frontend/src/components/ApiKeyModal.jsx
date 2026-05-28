import { useState, useEffect } from 'react'
import { X, Key, ExternalLink } from 'lucide-react'
import { getStoredKey, setStoredKey, clearStoredKey } from '../lib/api'

function ApiKeyModal({ isOpen, onClose, onSaved, dismissable = true }) {
  const [value, setValue] = useState('')
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    if (isOpen) setValue(getStoredKey())
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = (e) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    setStoredKey(trimmed)
    onSaved?.(trimmed)
    onClose?.()
  }

  const handleClear = () => {
    clearStoredKey()
    setValue('')
    onSaved?.('')
  }

  return (
    <div className="fixed inset-0 bg-violet-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-violet-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2 rounded-lg">
              <Key className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Your OpenAI API key</h2>
          </div>
          {dismissable && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Tutorly is a free, open-source demo. Bring your own OpenAI key — it&apos;s saved
          only in your browser&apos;s localStorage and sent with each request as a header.
          Nothing is stored on our servers.
        </p>

        <form onSubmit={handleSave} className="space-y-3">
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              autoFocus
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 pr-16 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              {showKey ? 'Hide' : 'Show'}
            </button>
          </div>

          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-violet-700 hover:underline"
          >
            Get a key from platform.openai.com <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={!value.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-lg hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              Save key
            </button>
            {getStoredKey() && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <p className="mt-4 text-xs text-gray-500">
          The key is sent as an <code className="bg-gray-100 px-1 rounded">X-OpenAI-Key</code> header.
          Typical cost per student question: ~$0.001.
        </p>
      </div>
    </div>
  )
}

export default ApiKeyModal
