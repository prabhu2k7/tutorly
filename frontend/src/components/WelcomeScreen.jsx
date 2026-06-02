import { useState } from 'react'
import { Sparkles, Play, ArrowRight, Youtube, AlertCircle } from 'lucide-react'
import ImportProgress from './ImportProgress'

const URL_PATTERN = /^https?:\/\/|youtube\.com|youtu\.be/i

function WelcomeScreen({ onCreateByName, onCreateFromYoutube, creating, hasKey, onRequestKey }) {
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  const isUrl = URL_PATTERN.test(trimmed)

  const submit = (e) => {
    e.preventDefault()
    if (!trimmed || creating) return
    if (isUrl) {
      if (!hasKey) {
        onRequestKey()
        return
      }
      onCreateFromYoutube(trimmed)
    } else {
      onCreateByName(trimmed)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-fuchsia-100 to-amber-100 p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-24 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
      <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />

      <div className="relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-xl w-full p-8 border border-white">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-gradient-to-br from-violet-500 via-fuchsia-500 to-amber-500 p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent uppercase tracking-wider">
            Tutorly
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">
          Turn your YouTube videos into a 24/7 AI tutor for your students.
        </h1>
        <p className="text-gray-600 mb-6">
          Paste your course videos. We&apos;ll pull the transcripts and build a tutor your students can chat with — scoped to your content, with clickable timestamps back to the source.
        </p>

        <a
          href="/?kb=demo"
          className="flex items-center justify-between gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white hover:opacity-95 transition-all mb-6 group shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/25 p-2 rounded-lg">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Try the demo first</div>
              <div className="text-sm text-violet-100">
                See it work with a 3Blue1Brown linear algebra video
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </a>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">Or create your own</span>
          </div>
        </div>

        {creating && isUrl ? (
          <ImportProgress subject={`URL: ${trimmed}`} compact />
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                Course name <span className="text-gray-400 font-normal">or paste a YouTube URL</span>
              </span>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Linear Algebra 101 — or https://youtube.com/watch?v=..."
                className={
                  'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ' +
                  (isUrl
                    ? 'border-red-300 focus:ring-red-500 bg-red-50/40'
                    : 'border-gray-300 focus:ring-violet-500')
                }
                disabled={creating}
                autoFocus
              />
              {isUrl && (
                <p className="mt-2 text-xs text-red-700 flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5" />
                  Looks like a YouTube URL — we&apos;ll use the video&apos;s title as the course name and import it.
                </p>
              )}
              {isUrl && !hasKey && (
                <p className="mt-1 text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  You&apos;ll need to set your OpenAI API key first.
                </p>
              )}
            </label>
            <button
              type="submit"
              disabled={creating || !trimmed}
              className={
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all shadow-md hover:shadow-lg ' +
                (isUrl
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white'
                  : 'bg-gray-900 hover:bg-gray-800 text-white')
              }
            >
              {creating
                ? 'Creating…'
                : (isUrl ? (
                    <>
                      <Youtube className="w-4 h-4" />
                      Import this video & create course
                    </>
                  ) : (
                    <>Create my course tutor <ArrowRight className="w-4 h-4" /></>
                  ))
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default WelcomeScreen
