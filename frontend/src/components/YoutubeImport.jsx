import { useState } from 'react'
import { Youtube } from 'lucide-react'
import ImportProgress from './ImportProgress'

function YoutubeImport({ onImport, importing }) {
  const [url, setUrl] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!url.trim() || importing) return
    const ok = await onImport(url.trim())
    if (ok) setUrl('')
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-violet-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Youtube className="w-5 h-5 text-red-600" />
        Import from YouTube
      </h2>

      {importing ? (
        <ImportProgress subject={url ? `URL: ${url}` : null} compact />
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Paste a YouTube video URL. We&apos;ll pull the transcript and turn it into course material.
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={importing}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={importing || !url.trim()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
            >
              <Youtube className="w-4 h-4" />
              Import video
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default YoutubeImport
