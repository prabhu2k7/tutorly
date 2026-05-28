import { useState } from 'react'
import { Sparkles, Play, ArrowRight } from 'lucide-react'

function WelcomeScreen({ onCreate, creating }) {
  const [name, setName] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || creating) return
    onCreate(trimmed)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-fuchsia-50 to-amber-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-8 border border-violet-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-semibold text-violet-600 uppercase tracking-wide">
            Tutorly
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Turn your YouTube videos into a 24/7 AI tutor for your students.
        </h1>
        <p className="text-gray-600 mb-6">
          Paste your course videos. We&apos;ll pull the transcripts and build a tutor your students can chat with — scoped to your content, with clickable timestamps back to the source.
        </p>

        <a
          href="/?kb=demo"
          className="flex items-center justify-between gap-3 w-full p-4 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 text-white hover:opacity-90 transition-all mb-6 group shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
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

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1">
              What&apos;s your course called?
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Linear Algebra 101"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              disabled={creating}
              autoFocus
            />
          </label>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
          >
            {creating ? 'Creating…' : 'Create my course tutor'}
            {!creating && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

export default WelcomeScreen
